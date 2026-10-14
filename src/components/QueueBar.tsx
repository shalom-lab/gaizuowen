import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, X, RotateCcw, Layers } from 'lucide-react';
import { GradingJob } from '../types';

interface QueueBarProps {
  jobs: GradingJob[];
  runningCount: number;
  pendingCount: number;
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
  onRetry: (id: string) => void;
  onClearFinished: () => void;
}

/**
 * The whole background-grading surface, designed to stay out of the way.
 *
 * Idle (nothing queued) renders nothing at all. While grading it is a single
 * slim line of text. Finished essays appear as one-tap chips; the list only
 * expands when the teacher asks for it.
 */
export const QueueBar: React.FC<QueueBarProps> = ({
  jobs,
  runningCount,
  pendingCount,
  onOpen,
  onDismiss,
  onRetry,
  onClearFinished,
}) => {
  const [expanded, setExpanded] = useState(false);

  const active = jobs.filter((j) => j.status === 'running' || j.status === 'pending');
  const done = jobs.filter((j) => j.status === 'done');
  const failed = jobs.filter((j) => j.status === 'error');
  const total = jobs.length;

  if (total === 0) return null;

  const runningJob = jobs.find((j) => j.status === 'running');

  return (
    <div className="sticky top-14 z-10 mx-4 mt-3">
      <div className="rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-sm overflow-hidden">
        {/* ---- slim status line ---- */}
        <div className="flex items-center gap-2 px-3 py-2">
          {runningCount > 0 ? (
            <Loader2 className="w-4 h-4 text-rose-600 animate-spin shrink-0" />
          ) : failed.length > 0 ? (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          ) : done.length > 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 min-w-0 text-left text-xs text-slate-600 truncate"
          >
            {runningCount > 0 && (
              <>
                <span className="font-semibold text-slate-800">
                  后台批改中{runningCount > 1 ? ` ${runningCount} 篇` : ''}
                </span>
                {runningJob && (
                  <span className="text-slate-500">
                    {' '}
                    · {runningJob.submission.studentName || '同学'} {runningJob.step ? `· ${runningJob.step}…` : '…'}
                  </span>
                )}
                {pendingCount > 0 && <span className="text-slate-400"> · 排队 {pendingCount}</span>}
              </>
            )}
            {runningCount === 0 && done.length > 0 && (
              <>
                <span className="font-semibold text-emerald-700">{done.length} 篇批改完成</span>
                <span className="text-slate-400"> · 点开查看</span>
              </>
            )}
            {runningCount === 0 && done.length === 0 && failed.length > 0 && (
              <span className="font-semibold text-red-600">{failed.length} 篇批改失败 · 点开重试</span>
            )}
          </button>

          {/* one-tap chips for finished essays */}
          <div className="flex items-center gap-1.5 shrink-0">
            {done.slice(0, 2).map((j) => (
              <button
                key={j.id}
                onClick={() => onOpen(j.id)}
                className="max-w-[110px] truncate px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 active:scale-95"
              >
                {j.result?.title || '已完成'}
              </button>
            ))}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded-lg text-slate-400 active:bg-slate-100"
              aria-label="展开队列"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* ---- expanded detail ---- */}
        {expanded && (
          <div className="border-t border-slate-100 max-h-64 overflow-y-auto">
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 last:border-0">
                <span className="shrink-0">
                  {j.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin" />}
                  {j.status === 'pending' && <span className="block w-3.5 h-3.5 rounded-full border-2 border-slate-300" />}
                  {j.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {j.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                </span>

                <button
                  onClick={() => j.status === 'done' && onOpen(j.id)}
                  disabled={j.status !== 'done'}
                  className="flex-1 min-w-0 text-left disabled:cursor-default"
                >
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {j.result?.title || j.submission.studentName || '未命名'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {j.status === 'done' && `${j.result?.overallScore} 分 · ${j.result?.annotations.length} 处批注`}
                    {j.status === 'running' && (j.step ? `${j.step}…` : '批改中…')}
                    {j.status === 'pending' && '排队中'}
                    {j.status === 'error' && (j.error || '批改失败')}
                  </div>
                </button>

                {j.status === 'error' && (
                  <button
                    onClick={() => onRetry(j.id)}
                    className="p-1.5 rounded-lg text-slate-400 active:text-rose-600"
                    aria-label="重试"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {j.status !== 'running' && (
                  <button
                    onClick={() => onDismiss(j.id)}
                    className="p-1.5 rounded-lg text-slate-300 active:text-slate-600"
                    aria-label="移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {(done.length > 0 || failed.length > 0) && (
              <button
                onClick={onClearFinished}
                className="w-full py-2 text-[11px] text-slate-400 active:text-red-600"
              >
                清除已完成 / 失败
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
