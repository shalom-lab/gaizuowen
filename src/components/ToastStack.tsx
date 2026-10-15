import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  jobId: string;
  title: string;
  score?: number;
  annotations?: number;
}

interface ToastStackProps {
  items: ToastItem[];
  onOpen: (jobId: string) => void;
  onDismiss: (id: string) => void;
}

/**
 * Completion notice.
 *
 * Deliberately transient: it fades on its own so nothing ever has to be closed
 * by hand, and tapping 查看 is the only required interaction. At most two are
 * shown at once — the counter badge on the history icon covers the rest.
 */
export const ToastStack: React.FC<ToastStackProps> = ({ items, onOpen, onDismiss }) => {
  if (items.length === 0) return null;

  return (
    <div className="fixed top-16 inset-x-0 z-40 px-4 pointer-events-none">
      <div className="max-w-2xl mx-auto space-y-2">
        {items.slice(0, 2).map((t) => (
          <Toast key={t.id} item={t} onOpen={onOpen} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
};

const AUTO_DISMISS_MS = 6000;

const Toast: React.FC<{
  item: ToastItem;
  onOpen: (jobId: string) => void;
  onDismiss: (id: string) => void;
}> = ({ item, onOpen, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-900/95 backdrop-blur text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />

      <button onClick={() => onOpen(item.jobId)} className="flex-1 min-w-0 text-left">
        <div className="text-xs font-bold truncate">《{item.title}》批改完成</div>
        <div className="text-[11px] text-slate-300 truncate">
          {typeof item.score === 'number' && `${item.score} 分`}
          {typeof item.annotations === 'number' && ` · ${item.annotations} 处批注`}
          {` · 点此查看`}
        </div>
      </button>

      <button
        onClick={() => onOpen(item.jobId)}
        className="shrink-0 px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-bold active:scale-95"
      >
        查看
      </button>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-1 rounded-lg text-slate-400 active:text-white"
        aria-label="关闭"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
