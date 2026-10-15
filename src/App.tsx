import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaptureScreen } from './components/CaptureScreen';
import { ResultScreen } from './components/ResultScreen';
import { HistorySheet } from './components/HistorySheet';
import { SettingsSheet } from './components/SettingsSheet';
import { HelpSheet } from './components/HelpSheet';
import { QueueBar } from './components/QueueBar';
import { ToastStack, ToastItem } from './components/ToastStack';
import { ExportPreview } from './components/ExportPreview';
import { GradingSubmission } from './types';
import {
  getAllGradedEssaysFromIndexedDB,
  deleteGradedEssayFromIndexedDB,
  clearAllEssaysFromIndexedDB,
  StoredEssayRecord,
} from './utils/indexedDb';
import { loadSecrets, Secrets } from './utils/byok';
import { useGradingQueue } from './hooks/useGradingQueue';
import { useWakeLock } from './hooks/useWakeLock';
import { historyBadge } from './utils/historyBadge';
import { BookOpen, History, Settings, KeyRound } from 'lucide-react';

export default function App() {
  const [history, setHistory] = useState<StoredEssayRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  /** An essay opened from history, shown without touching the queue. */
  const [archivedView, setArchivedView] = useState<StoredEssayRecord | null>(null);
  /** True while the teacher is mid-way through collecting an essay's pages. */
  const [collecting, setCollecting] = useState(false);
  /** Records being prepared for print/PDF export. */
  const [exporting, setExporting] = useState<StoredEssayRecord[] | null>(null);

  const [secrets, setSecrets] = useState<Secrets>(() => loadSecrets());
  const hasKey = Boolean(secrets.apiKey);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await getAllGradedEssaysFromIndexedDB());
    } catch (err) {
      console.warn('history refresh failed:', err);
    }
  }, []);

  const queue = useGradingQueue({
    apiKey: secrets.apiKey,
    baseUrl: secrets.baseUrl,
    onArchived: refreshHistory,
  });

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // ---- completion notices: one transient toast each, nothing to close ----
  const seenDone = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!queue.hydrated) return;

    // On restore, treat previously-finished jobs as already announced.
    if (!seeded.current) {
      seeded.current = true;
      queue.jobs.forEach((j) => {
        if (j.status === 'done') seenDone.current.add(j.id);
      });
      return;
    }

    const fresh = queue.jobs.filter((j) => j.status === 'done' && !seenDone.current.has(j.id));
    if (fresh.length === 0) return;
    fresh.forEach((j) => seenDone.current.add(j.id));

    setToasts((prev) =>
      [
        ...prev,
        ...fresh.map((j) => ({
          id: `toast-${j.id}`,
          jobId: j.id,
          title: j.result?.title || '未命名作文',
          score: j.result?.overallScore,
          annotations: j.result?.annotations.length,
        })),
      ].slice(-2)
    );
  }, [queue.jobs, queue.hydrated]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openJob = useCallback(
    (jobId: string) => {
      setArchivedView(null);
      queue.openJob(jobId);
      dismissToast(`toast-${jobId}`);
    },
    [queue, dismissToast]
  );

  const handleSubmit = (data: GradingSubmission) => {
    if (!secrets.apiKey) {
      setSettingsOpen(true);
      setNotice('请先在设置中填入 DeepSeek API Key,然后再提交批改。');
      return;
    }
    const id = queue.enqueue(data);
    if (!id) {
      setNotice('排队已满 20 篇,请先等前面的批完。');
      return;
    }
    setNotice(null);
  };

  // ---- auto-open only when the teacher is genuinely idle ----
  // Never interrupt active reading, and never yank the screen away mid-capture.
  useEffect(() => {
    if (archivedView || collecting) return;
    if (queue.activeJobId) return;
    const next = queue.jobs.find((j) => j.status === 'done' && !j.read);
    if (next) openJob(next.id);
  }, [queue.jobs, queue.activeJobId, archivedView, collecting, openJob]);

  const liveJob = queue.activeJob;
  const shownResult = archivedView?.gradingResult ?? liveJob?.result ?? null;
  const shownImages =
    archivedView?.imageUrls ?? (liveJob ? liveJob.submission.images.map((i) => i.dataUrl) : []);

  const exitResult = () => {
    setArchivedView(null);
    queue.closeActiveJob();
  };

  // While the teacher is reading comments and writing them on paper, the screen
  // must not dim on her. Also held while she is lining up the next photo.
  useWakeLock(Boolean(shownResult) || collecting);

  /** Essay ids whose result has not been opened yet, for the 新 chip. */
  const unreadIds = useMemo(
    () => new Set(queue.jobs.filter((j) => j.status === 'done' && !j.read).map((j) => `essay-${j.id}`)),
    [queue.jobs]
  );

  /** Top-right badge: one meaning only (see utils/historyBadge.ts). */
  const badge = historyBadge(queue.unreadCount);

  // The export screen replaces the whole app so the printout contains only the
  // document (plus its own control bar, which is marked .no-print).
  if (exporting && exporting.length > 0) {
    return <ExportPreview records={exporting} onClose={() => setExporting(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">作文批改助手</h1>
              <p className="text-[11px] text-slate-400 leading-tight truncate">
                {hasKey ? '后台批改 · 随时继续拍下一篇' : '未配置 API Key'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {shownResult && (
              <button
                onClick={exitResult}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 active:scale-95"
              >
                继续批改
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(true)}
              className="relative p-2 rounded-lg text-slate-500 active:bg-slate-100"
              aria-label={badge.show ? `批改记录，有 ${queue.unreadCount} 篇新的` : '批改记录'}
            >
              <History className="w-5 h-5" />
              {/*
                One meaning only: how many results are waiting to be opened.
                Rose = needs your attention (never green — green means "success").
              */}
              {badge.show && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {badge.label}
                </span>
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className={`relative p-2 rounded-lg active:bg-slate-100 ${hasKey ? 'text-slate-500' : 'text-amber-600'}`}
              aria-label="设置"
            >
              <Settings className="w-5 h-5" />
              {!hasKey && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      <ToastStack items={toasts} onOpen={openJob} onDismiss={dismissToast} />

      <main className="flex-1 w-full max-w-2xl mx-auto">
        <QueueBar
          jobs={queue.jobs}
          runningCount={queue.runningCount}
          pendingCount={queue.pendingCount}
          onDismiss={queue.dismissJob}
          onRetry={queue.retryJob}
        />

        {notice && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            {notice}
          </div>
        )}

        {!hasKey && !shownResult && (
          <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">先填入 DeepSeek API Key</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  密钥只保存在本机浏览器。填一次以后就不用再填了。
                </p>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold active:scale-95"
                >
                  去设置
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="mt-2.5 ml-3 text-xs font-semibold text-amber-800 underline"
                >
                  不知道去哪拿 Key？
                </button>
              </div>
            </div>
          </div>
        )}

        {shownResult ? (
          <ResultScreen result={shownResult} imageUrls={shownImages} onNewEssay={exitResult} />
        ) : (
          <CaptureScreen
            onSubmit={handleSubmit}
            queueCount={queue.pendingCount + queue.runningCount}
            hasKey={hasKey}
            onCollectingChange={setCollecting}
          />
        )}
      </main>

      <HistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={history}
        unreadIds={unreadIds}
        onSelect={(rec) => {
          setHistoryOpen(false);
          setArchivedView(rec);
        }}
        onDelete={async (id) => {
          await deleteGradedEssayFromIndexedDB(id);
          refreshHistory();
        }}
        onDeleteMany={async (ids) => {
          for (const id of ids) await deleteGradedEssayFromIndexedDB(id);
          refreshHistory();
        }}
        onClearAll={async () => {
          await clearAllEssaysFromIndexedDB();
          setHistory([]);
        }}
        onExport={(records) => {
          setHistoryOpen(false);
          setExporting(records);
        }}
      />

      <SettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        secrets={secrets}
        onSecretsChanged={(next) => {
          setSecrets(next);
          if (next.apiKey) setNotice(null);
        }}
        onOpenHelp={() => {
          setSettingsOpen(false);
          setHelpOpen(true);
        }}
      />

      <HelpSheet isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
