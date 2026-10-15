import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GradingJob, GradingSubmission } from '../types';
import { gradeEssay } from '../utils/grade';
import { formatErrorMessage, isRetryable } from '../../shared/deepseek.mjs';
import {
  MAX_CONCURRENT,
  MAX_QUEUED,
  MAX_AUTO_RETRIES,
  canEnqueue,
  pickAutoOpenId,
  pickNextJob,
  retryDecision,
} from '../../shared/queue.mjs';
import {
  saveGradedEssayToIndexedDB,
  saveJobQueueToIndexedDB,
  loadJobQueueFromIndexedDB,
  StoredEssayRecord,
} from '../utils/indexedDb';

const STEPS = ['识别手写字迹', '逐页转写原文', '查找错别字与病句', '整理批注与总评'];

/**
 * Finished jobs are kept only briefly, so the persisted queue cannot grow
 * without bound. Their results are already archived in 批改记录 (which holds
 * the images too), so dropping them here loses nothing viewable.
 */
const KEEP_FINISHED = 5;

interface UseGradingQueueOptions {
  apiKey: string;
  baseUrl: string;
  /** Called whenever a result is archived, so history can refresh. */
  onArchived?: () => void;
}

export interface GradingQueue {
  jobs: GradingJob[];
  /** True once the persisted queue has been read back. */
  hydrated: boolean;
  /** The finished job whose result is currently on screen. */
  activeJob: GradingJob | null;
  activeJobId: string | null;
  runningCount: number;
  pendingCount: number;
  /** Finished but not yet opened — drives the history badge. */
  unreadCount: number;
  enqueue: (submission: GradingSubmission) => string | null;
  openJob: (id: string) => void;
  closeActiveJob: () => void;
  dismissJob: (id: string) => void;
  retryJob: (id: string) => void;
}

/**
 * Background grading with a small amount of parallelism.
 *
 * The teacher submits an essay and is immediately free to capture the next one.
 * Jobs run silently; when one finishes and nothing is being read, it opens
 * itself, otherwise it waits as an unread notification so it never interrupts.
 */
export function useGradingQueue({ apiKey, baseUrl, onArchived }: UseGradingQueueOptions): GradingQueue {
  const [jobs, setJobs] = useState<GradingJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Guards against the same job being started twice by overlapping renders.
  const inFlight = useRef<Set<string>>(new Set());

  // Keep the latest callback without making it a scheduler dependency.
  const archivedRef = useRef(onArchived);
  useEffect(() => {
    archivedRef.current = onArchived;
  }, [onArchived]);

  // ---- restore queue on mount ----
  useEffect(() => {
    (async () => {
      const saved = await loadJobQueueFromIndexedDB();
      setJobs(saved);
      const lastDone = [...saved].reverse().find((j) => j.status === 'done');
      if (lastDone) setActiveJobId(lastDone.id);
      setHydrated(true);
    })();
  }, []);

  // ---- persist on meaningful change (status/read flags, not step ticks) ----
  const persistKey = useMemo(
    () => jobs.map((j) => `${j.id}:${j.status}:${j.read ? 1 : 0}`).join('|'),
    [jobs]
  );
  useEffect(() => {
    if (!hydrated) return;
    saveJobQueueToIndexedDB(jobs).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey, hydrated]);

  const patchJob = useCallback((id: string, patch: Partial<GradingJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const runJob = useCallback(
    async (job: GradingJob) => {
      const controller = new AbortController();
      inFlight.current.add(job.id);
      patchJob(job.id, { status: 'running', step: STEPS[0], error: undefined });

      let step = 0;
      const timer = setInterval(() => {
        step = Math.min(step + 1, STEPS.length - 1);
        patchJob(job.id, { step: STEPS[step] });
      }, 6000);

      try {
        const { result } = await gradeEssay(
          {
            images: job.submission.images,
            gradeLevel: job.submission.gradeLevel,
            studentName: job.submission.studentName,
            promptHint: job.submission.promptHint,
          },
          { apiKey, baseUrl, signal: controller.signal }
        );

        patchJob(job.id, { status: 'done', result, step: '', finishedAt: Date.now(), read: false });

        // Archive so a paper survives a closed tab.
        try {
          const record: StoredEssayRecord = {
            id: `essay-${job.id}`,
            title: result.title || '未命名作文',
            studentName: job.submission.studentName || '同学',
            gradeLevel: job.submission.gradeLevel,
            overallScore: result.overallScore,
            letterGrade: result.letterGrade,
            pageCount: job.submission.images.length,
            imageUrls: job.submission.images.map((i) => i.dataUrl),
            gradingResult: result,
            createdAt: Date.now(),
          };
          await saveGradedEssayToIndexedDB(record);
          archivedRef.current?.();
        } catch (e) {
          console.warn('[queue] archive failed:', e);
        }
      } catch (err) {
        const raw = String((err as any)?.message || err);
        const decision = retryDecision(raw, job.attempts, isRetryable);

        if (decision.action === 'retry') {
          // Heal silently: hold the slot while backing off, then requeue.
          // `inFlight` is released so this does not consume a concurrency slot
          // and other essays keep moving.
          patchJob(job.id, {
            status: 'running',
            step: `网络波动,自动重试 ${decision.attempts}/${MAX_AUTO_RETRIES}`,
            attempts: decision.attempts,
            error: undefined,
          });
          inFlight.current.delete(job.id);
          setTimeout(() => {
            patchJob(job.id, { status: 'pending', step: '', attempts: decision.attempts });
          }, decision.delayMs);
        } else {
          patchJob(job.id, {
            status: 'error',
            step: '',
            error: formatErrorMessage(err),
            attempts: decision.attempts,
            finishedAt: Date.now(),
          });
        }
      } finally {
        clearInterval(timer);
        inFlight.current.delete(job.id);
      }
    },
    [apiKey, baseUrl, patchJob]
  );

  // ---- scheduler: keep up to MAX_CONCURRENT jobs going ----
  useEffect(() => {
    if (!hydrated || !apiKey) return;
    const next = pickNextJob(jobs, inFlight.current, MAX_CONCURRENT);
    if (next) void runJob(next);
  }, [jobs, hydrated, apiKey, runJob]);

  // ---- auto-open a finished result, but never interrupt active reading ----
  useEffect(() => {
    if (!hydrated) return;
    const id = pickAutoOpenId(jobs, activeJobId);
    if (id) setActiveJobId(id);
  }, [jobs, activeJobId, hydrated]);

  const enqueue = useCallback(
    (submission: GradingSubmission): string | null => {
      if (!canEnqueue(jobs, MAX_QUEUED)) return null;
      const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setJobs((prev) => [
        ...prev,
        { id, status: 'pending', step: '', submission, createdAt: Date.now(), read: false },
      ]);
      return id;
    },
    [jobs]
  );

  const openJob = useCallback(
    (id: string) => {
      setActiveJobId(id);
      patchJob(id, { read: true });
    },
    [patchJob]
  );

  const closeActiveJob = useCallback(() => {
    setActiveJobId((id) => {
      if (id) patchJob(id, { read: true });
      return null;
    });
  }, [patchJob]);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setActiveJobId((cur) => (cur === id ? null : cur));
  }, []);

  const retryJob = useCallback((id: string) => {
    inFlight.current.delete(id);
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'pending', error: undefined, step: '' } : j))
    );
  }, []);

  // ---- keep the queue bounded ----
  useEffect(() => {
    const finished = jobs.filter((j) => j.status === 'done' || j.status === 'error');
    if (finished.length <= KEEP_FINISHED) return;
    const keep = new Set(finished.slice(-KEEP_FINISHED).map((j) => j.id));
    if (activeJobId) keep.add(activeJobId);
    setJobs((prev) =>
      prev.filter((j) => j.status === 'pending' || j.status === 'running' || keep.has(j.id))
    );
  }, [jobs, activeJobId]);

  const activeJob = useMemo(
    () => (activeJobId ? jobs.find((j) => j.id === activeJobId && j.status === 'done') || null : null),
    [jobs, activeJobId]
  );

  return {
    jobs,
    hydrated,
    activeJob,
    activeJobId,
    runningCount: jobs.filter((j) => j.status === 'running').length,
    pendingCount: jobs.filter((j) => j.status === 'pending').length,
    unreadCount: jobs.filter((j) => j.status === 'done' && !j.read).length,
    enqueue,
    openJob,
    closeActiveJob,
    dismissJob,
    retryJob,
  };
}
