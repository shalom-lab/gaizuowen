import React, { useCallback, useEffect, useState } from 'react';
import { CaptureScreen } from './components/CaptureScreen';
import { ResultScreen } from './components/ResultScreen';
import { HistorySheet } from './components/HistorySheet';
import { SettingsSheet } from './components/SettingsSheet';
import { QueueBar } from './components/QueueBar';
import { GradingSubmission } from './types';
import {
  getAllGradedEssaysFromIndexedDB,
  deleteGradedEssayFromIndexedDB,
  clearAllEssaysFromIndexedDB,
  StoredEssayRecord,
} from './utils/indexedDb';
import { loadSecrets, Secrets } from './utils/byok';
import { useGradingQueue } from './hooks/useGradingQueue';
import { BookOpen, History, Settings, KeyRound } from 'lucide-react';

export default function App() {
  const [history, setHistory] = useState<StoredEssayRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** An older essay opened from history, shown without touching the queue. */
  const [archivedView, setArchivedView] = useState<StoredEssayRecord | null>(null);

  // BYOK secrets are read synchronously so the first render already knows
  // whether a key exists — the contract is "read at startup, never nag".
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

  /**
   * Submit an essay. It joins the queue and the teacher is immediately free to
   * capture the next one — nothing blocks on the model call.
   */
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

  const liveJob = queue.activeJob;
  const shownResult = archivedView?.gradingResult ?? liveJob?.result ?? null;
  const shownImages =
    archivedView?.imageUrls ?? (liveJob ? liveJob.submission.images.map((i) => i.dataUrl) : []);

  const exitResult = () => {
    setArchivedView(null);
    queue.closeActiveJob();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Compact, sticky header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
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
              aria-label="批改记录"
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {history.length > 99 ? '99' : history.length}
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

      <main className="flex-1 w-full max-w-2xl mx-auto">
        {/* Silent background-grading status; renders nothing when idle. */}
        <QueueBar
          jobs={queue.jobs}
          runningCount={queue.runningCount}
          pendingCount={queue.pendingCount}
          onOpen={queue.openJob}
          onDismiss={queue.dismissJob}
          onRetry={queue.retryJob}
          onClearFinished={queue.clearFinished}
        />

        {notice && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            {notice}
          </div>
        )}

        {/* First-run guidance, non-blocking */}
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
          />
        )}
      </main>

      <HistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={history}
        onSelect={(rec) => {
          setHistoryOpen(false);
          // Archived essays may have no live queue job, so show them directly.
          setArchivedView(rec);
        }}
        onDelete={async (id) => {
          await deleteGradedEssayFromIndexedDB(id);
          refreshHistory();
        }}
        onClearAll={async () => {
          await clearAllEssaysFromIndexedDB();
          setHistory([]);
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
      />
    </div>
  );
}
