// Invariant tests for the background grading queue.
// These cover the failure modes that would actually hurt a teacher mid-lesson:
// double-starting a job (double billing), unbounded concurrency, and a finished
// result yanking the screen away while she is copying the current one.
import { strict as assert } from 'assert';
import {
  MAX_CONCURRENT,
  MAX_QUEUED,
  MAX_AUTO_RETRIES,
  activeCount,
  canEnqueue,
  pickNextJob,
  pickAutoOpenId,
  normalizeOnLoad,
  retryDecision,
} from '../shared/queue.mjs';
import { isRetryable } from '../shared/deepseek.mjs';

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log('PASS  ' + name);
    pass++;
  } catch (e) {
    console.log('FAIL  ' + name + '\n      ' + e.message);
    fail++;
  }
};

const job = (id, status, extra = {}) => ({ id, status, step: '', read: false, ...extra });
const none = new Set();

check('idle queue picks nothing', () => {
  assert.equal(pickNextJob([], none), null);
});

check('a pending job is picked', () => {
  const j = pickNextJob([job('a', 'pending')], none);
  assert.equal(j.id, 'a');
});

check('concurrency is capped at MAX_CONCURRENT', () => {
  const running = [job('a', 'running'), job('b', 'running'), job('c', 'pending')];
  const inFlight = new Set(['a', 'b']);
  assert.equal(pickNextJob(running, inFlight, MAX_CONCURRENT), null, 'must not exceed the cap');
});

check('one slot free -> exactly one more starts', () => {
  const jobs = [job('a', 'running'), job('b', 'pending'), job('c', 'pending')];
  const inFlight = new Set(['a']);
  const picked = pickNextJob(jobs, inFlight, MAX_CONCURRENT);
  assert.equal(picked.id, 'b');
});

check('in-flight job is never started twice', () => {
  // Status has not committed to state yet, but the run already began.
  const jobs = [job('a', 'pending')];
  const inFlight = new Set(['a']);
  assert.equal(pickNextJob(jobs, inFlight, MAX_CONCURRENT), null);
});

check('done and error jobs are never picked', () => {
  const jobs = [job('a', 'done'), job('b', 'error')];
  assert.equal(pickNextJob(jobs, none, MAX_CONCURRENT), null);
});

check('queue cap blocks further submissions', () => {
  const full = Array.from({ length: MAX_QUEUED }, (_, i) => job('j' + i, 'pending'));
  assert.equal(canEnqueue(full, MAX_QUEUED), false);
  assert.equal(canEnqueue(full.slice(0, MAX_QUEUED - 1), MAX_QUEUED), true);
});

check('activeCount counts pending + running only', () => {
  const jobs = [job('a', 'pending'), job('b', 'running'), job('c', 'done'), job('d', 'error')];
  assert.equal(activeCount(jobs), 2);
});

check('auto-open picks the first unread finished job', () => {
  const jobs = [job('a', 'done', { read: true }), job('b', 'done'), job('c', 'done')];
  assert.equal(pickAutoOpenId(jobs, null), 'b');
});

check('auto-open does NOT steal focus from a result being read', () => {
  const jobs = [job('a', 'done', { read: true }), job('b', 'done')];
  // Teacher is reading 'a' (already marked read) -> leave the screen alone.
  assert.equal(pickAutoOpenId(jobs, 'a'), null);
});

check('auto-open resumes after the reader is closed', () => {
  const jobs = [job('a', 'done', { read: true }), job('b', 'done')];
  assert.equal(pickAutoOpenId(jobs, null), 'b');
});

check('a running job reopens nothing', () => {
  const jobs = [job('a', 'running')];
  assert.equal(pickAutoOpenId(jobs, 'a'), null);
});

check('already-read results never auto-open again', () => {
  const jobs = [job('a', 'done', { read: true }), job('b', 'done', { read: true })];
  assert.equal(pickAutoOpenId(jobs, null), null);
});

check('reload requeues an interrupted job', () => {
  const loaded = normalizeOnLoad([job('a', 'running', { step: '查找错别字与病句' }), job('b', 'done')]);
  assert.equal(loaded[0].status, 'pending');
  assert.equal(loaded[0].step, '', 'stale step text must be cleared');
  assert.equal(loaded[1].status, 'done', 'finished jobs stay finished');
});

check('full drain: 5 queued essays all complete, max 2 at once', () => {
  let jobs = Array.from({ length: 5 }, (_, i) => job('j' + i, 'pending'));
  const inFlight = new Set();
  let peak = 0;
  let guard = 0;

  // Simulate the scheduler/runner loop: start until the cap is reached, then
  // complete one job per tick.
  const finishOne = () => {
    const running = jobs.filter((j) => j.status === 'running');
    if (!running.length) return false;
    const d = running[0];
    inFlight.delete(d.id);
    jobs = jobs.map((j) => (j.id === d.id ? { ...j, status: 'done' } : j));
    return true;
  };

  while (jobs.some((j) => j.status !== 'done') && guard++ < 200) {
    let started = false;
    for (;;) {
      const next = pickNextJob(jobs, inFlight, MAX_CONCURRENT);
      if (!next) break;
      inFlight.add(next.id);
      jobs = jobs.map((j) => (j.id === next.id ? { ...j, status: 'running' } : j));
      peak = Math.max(peak, inFlight.size);
      started = true;
    }
    if (!finishOne() && !started) break;
  }

  assert.equal(jobs.filter((j) => j.status === 'done').length, 5, 'all essays must finish');
  assert.ok(peak <= MAX_CONCURRENT, 'peak concurrency ' + peak + ' exceeded cap');
  assert.ok(peak >= 2, 'scheduler should have used the available parallelism');
});

// ---- silent self-healing ----

check('a network blip retries without bothering the teacher', () => {
  const d = retryDecision('fetch failed', 0, isRetryable);
  assert.equal(d.action, 'retry');
  assert.equal(d.attempts, 1);
  assert.ok(d.delayMs > 0, 'must back off before retrying');
});

check('backoff grows with each attempt', () => {
  const a = retryDecision('HTTP 500: oops', 0, isRetryable);
  const b = retryDecision('HTTP 500: oops', 1, isRetryable);
  assert.ok(b.delayMs > a.delayMs, 'backoff should increase');
});

check('retries stop after MAX_AUTO_RETRIES and surface to her', () => {
  let attempts = 0;
  let d = retryDecision('fetch failed', attempts, isRetryable);
  while (d.action === 'retry') {
    attempts = d.attempts;
    d = retryDecision('fetch failed', attempts, isRetryable);
    assert.ok(attempts <= MAX_AUTO_RETRIES, 'exceeded retry budget');
  }
  assert.equal(d.action, 'fail');
  assert.equal(attempts, MAX_AUTO_RETRIES);
});

check('a bad API key is NOT retried behind her back', () => {
  const d = retryDecision('HTTP 401: invalid api key', 0, isRetryable);
  assert.equal(d.action, 'fail', 'she must be told, not silently looped');
});

check('an empty balance is NOT retried behind her back', () => {
  const d = retryDecision('HTTP 402: insufficient balance', 0, isRetryable);
  assert.equal(d.action, 'fail');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);