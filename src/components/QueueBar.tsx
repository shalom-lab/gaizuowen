import React, { useState } from 'react';
import { Loader2, AlertCircle, ChevronDown, X, RotateCcw, Layers } from 'lucide-react';
import { GradingJob } from '../types';

interface QueueBarProps {
  jobs: GradingJob[];
  runningCount: number;
  pendingCount: number;
  onDismiss: (id: string) => void;
  onRetry: (id: string) => void;
}

/**
 * Progress and failures only.
 *
 * Finished essays are deliberately absent: they surface once as a transient
 * toast and then live in 批改记录, so there is never anything here to clean up
 * by hand. Renders nothing when idle.
 */
export const QueueBar: React.FC<QueueBarProps> = ({
  jobs,
  runningCount,
  pendingCount,
  onDismiss,
  onRetry,
}) => {
  const [expanded, setExpanded] = useState(false);

  const active = jobs.filter((j) => j.status === 'running' || j.status === 'pending');
  const failed = jobs.filter((j) => j.status === 'error');

  if (active.length === 0 && failed.length === 0) return null;

  const runningJob = jobs.find((j) => j.status === 'running');

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        {runningCount > 0 ? (
          <Loader2 className="w-4 h-4 text-rose-600 animate-spin shrink-0" />
        ) : failed.length > 0 ? (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        ) : (
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left text-xs truncate text-slate-600"
        >
          {runningCount > 0 ? (
            <>
              <span className="font-semibold text-slate-800">
                后台批改中{runningCount > 1 ? ` ${runningCount} 篇` : ''}
              </span>
              {runningJob && (
                <span className="text-slate-500">
                  {' '}
                  · {runningJob.submission.studentName || '同学'}
                  {runningJob.step ? ` · ${runningJob.step}…` : '…'}
                </span>
              )}
              {pendingCount > 0 && <span className="text-slate-400"> · 排队 {pendingCount}</span>}
            </>
          ) : (
            <span className="font-semibold text-red-600">{failed.length} 篇批改失败</span>
          )}
        </button>

        {(active.length > 1 || failed.length > 0) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded-lg text-slate-400 active:bg-slate-100 shrink-0"
            aria-label="展开"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 max-h-56 overflow-y-auto">
          {[...active, ...failed].map((j) => (
            <div key={j.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-0">
              <span className="shrink-0">
                {j.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin" />}
                {j.status === 'pending' && (
                  <span className="block w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                )}
                {j.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {j.submission.studentName || '未命名'}
                  <span className="text-slate-400 font-normal">
                    {' '}
                    · {j.submission.images.length} 页
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {j.status === 'running' && (j.step ? `${j.step}…` : '批改中…')}
                  {j.status === 'pending' && '排队中'}
                  {j.status === 'error' && (j.error || '批改失败')}
                </div>
              </div>

              {j.status === 'error' && (
                <button
                  onClick={() => onRetry(j.id)}
                  className="p-1.5 rounded-lg text-slate-400 active:text-rose-600 shrink-0"
                  aria-label="重试"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {j.status === 'pending' && (
                <button
                  onClick={() => onDismiss(j.id)}
                  className="p-1.5 rounded-lg text-slate-300 active:text-slate-600 shrink-0"
                  aria-label="移除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
