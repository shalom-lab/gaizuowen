/**
 * Pure scheduling logic for the background grading queue.
 *
 * Kept free of React so the invariants that actually matter can be unit tested:
 *  - a job is never started twice (including across re-renders)
 *  - concurrency stays bounded
 *  - a finished result never steals focus from one being read
 *
 * Shared by src/hooks/useGradingQueue.ts and scripts/test-queue.mjs.
 */

/** Two at a time keeps a batch moving; callDeepSeek already retries on 429. */
export const MAX_CONCURRENT = 2;

/** Bounded because every queued job holds its page images in IndexedDB. */
export const MAX_QUEUED = 20;

export function activeCount(jobs) {
  return jobs.filter((j) => j.status === 'pending' || j.status === 'running').length;
}

export function canEnqueue(jobs, maxQueued = MAX_QUEUED) {
  return activeCount(jobs) < maxQueued;
}

/**
 * The next job to start, or null.
 *
 * `inFlightIds` is the set of jobs a run has already begun for. It is checked in
 * addition to `status` because React may invoke the scheduler effect again
 * before the `running` status has been committed to state.
 */
export function pickNextJob(jobs, inFlightIds, maxConcurrent = MAX_CONCURRENT) {
  const running = jobs.filter((j) => j.status === 'running' && inFlightIds.has(j.id)).length;
  if (running >= maxConcurrent) return null;
  return jobs.find((j) => j.status === 'pending' && !inFlightIds.has(j.id)) || null;
}

/**
 * Which finished job should open itself, or null to leave the screen alone.
 * Returns null when the teacher is already reading a finished result.
 */
export function pickAutoOpenId(jobs, activeJobId) {
  if (activeJobId && jobs.some((j) => j.id === activeJobId && j.status === 'done')) return null;
  const next = jobs.find((j) => j.status === 'done' && !j.read);
  return next ? next.id : null;
}

/**
 * Jobs restored from storage. A job that was mid-flight when the page unloaded
 * goes back to pending and is re-run — the model call is idempotent, so the only
 * cost is tokens, which beats silently losing a queued essay.
 */
export function normalizeOnLoad(jobs) {
  return jobs.map((j) => (j.status === 'running' ? { ...j, status: 'pending', step: '' } : j));
}

/** Silent self-healing on a phone: two extra tries, then tell the teacher. */
export const MAX_AUTO_RETRIES = 2;

/**
 * Decide what to do after a failed attempt.
 *
 * `isRetryable` is injected so this module stays dependency-free: transient
 * failures retry on their own, but anything the teacher must fix (bad key, no
 * balance) surfaces immediately instead of retrying forever behind her back.
 *
 * @returns {{action:'retry'|'fail', attempts:number, delayMs:number}}
 */
export function retryDecision(errorMessage, attempts, isRetryable, maxRetries = MAX_AUTO_RETRIES) {
  const next = (attempts || 0) + 1;
  if (next <= maxRetries && isRetryable(errorMessage)) {
    // Back off a little more each time; a phone may be switching networks.
    return { action: 'retry', attempts: next, delayMs: 4000 * next };
  }
  return { action: 'fail', attempts: next, delayMs: 0 };
}
