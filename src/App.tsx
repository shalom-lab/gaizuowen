import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CaptureScreen } from './components/CaptureScreen';
import { ResultScreen } from './components/ResultScreen';
import { HistorySheet } from './components/HistorySheet';
import { SettingsSheet } from './components/SettingsSheet';
import { EssayGradingResult, UploadedImagePage } from './types';
import {
  saveGradedEssayToIndexedDB,
  getAllGradedEssaysFromIndexedDB,
  deleteGradedEssayFromIndexedDB,
  clearAllEssaysFromIndexedDB,
  saveActiveDraftToIndexedDB,
  loadActiveDraftFromIndexedDB,
  StoredEssayRecord,
} from './utils/indexedDb';
import { loadSecrets, Secrets } from './utils/byok';
import { gradeEssay } from './utils/grade';
import { formatErrorMessage } from '../shared/deepseek.mjs';
import { BookOpen, History, Settings, KeyRound } from 'lucide-react';

interface Submission {
  images: UploadedImagePage[];
  gradeLevel: string;
  studentName: string;
  promptHint: string;
}

const STEPS = [
  '正在识别手写字迹…',
  '正在逐页转写原文…',
  '正在查找错别字与病句…',
  '正在整理批注与总评…',
];

export default function App() {
  const [result, setResult] = useState<EssayGradingResult | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stepText, setStepText] = useState(STEPS[0]);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [history, setHistory] = useState<StoredEssayRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Bootstrap secrets synchronously so the first render already knows whether
  // a key exists — the BYOK contract is "read at startup, never nag".
  const [secrets, setSecrets] = useState<Secrets>(() => loadSecrets());

  const abortRef = useRef<AbortController | null>(null);

  const hasKey = Boolean(secrets.apiKey);

  // Restore history + any in-flight draft.
  useEffect(() => {
    (async () => {
      try {
        setHistory(await getAllGradedEssaysFromIndexedDB());
        const draft = await loadActiveDraftFromIndexedDB();
        if (draft?.gradingResult && draft.currentImages?.length) {
          setResult(draft.gradingResult);
          setImages(draft.currentImages);
        }
      } catch (err) {
        console.warn('IndexedDB init failed:', err);
      }
    })();
  }, []);

  // Persist the current result so a refresh or phone lock doesn't lose it.
  useEffect(() => {
    if (result && images.length > 0) {
      saveActiveDraftToIndexedDB({ currentImages: images, gradingResult: result }).catch(() => {});
    }
  }, [result, images]);

  const handleGrade = async (data: Submission) => {
    if (!secrets.apiKey) {
      setSettingsOpen(true);
      setError('请先在设置中填入 DeepSeek API Key，然后再开始批改。');
      return;
    }

    // Cancel any still-running request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setLastSubmission(data);
    setIsLoading(true);

    let step = 0;
    setStepText(STEPS[0]);
    const timer = setInterval(() => {
      step = Math.min(step + 1, STEPS.length - 1);
      setStepText(STEPS[step]);
    }, 6000);

    try {
      const { result: graded } = await gradeEssay(
        {
          images: data.images.map((i) => ({ dataUrl: i.dataUrl, name: i.name })),
          gradeLevel: data.gradeLevel,
          studentName: data.studentName,
          promptHint: data.promptHint,
        },
        { apiKey: secrets.apiKey, baseUrl: secrets.baseUrl, signal: controller.signal }
      );

      const urls = data.images.map((i) => i.dataUrl);
      setResult(graded);
      setImages(urls);

      // Auto-archive so a paper isn't lost if the teacher closes the tab.
      try {
        const record: StoredEssayRecord = {
          id: `essay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: graded.title || '未命名作文',
          studentName: data.studentName || '同学',
          gradeLevel: data.gradeLevel,
          overallScore: graded.overallScore,
          letterGrade: graded.letterGrade,
          pageCount: data.images.length,
          imageUrls: urls,
          gradingResult: graded,
          createdAt: Date.now(),
        };
        await saveGradedEssayToIndexedDB(record);
        setHistory(await getAllGradedEssaysFromIndexedDB());
      } catch (e) {
        console.warn('archive failed:', e);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(formatErrorMessage(err));
    } finally {
      clearInterval(timer);
      setIsLoading(false);
    }
  };

  const handleNew = () => {
    abortRef.current?.abort();
    setResult(null);
    setImages([]);
    setError(null);
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
                {hasKey ? '上传 · 识别 · 批注' : '未配置 API Key'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {result && (
              <button
                onClick={handleNew}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 active:scale-95"
              >
                下一篇
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
        {/* First-run hint: guide to settings without a blocking modal. */}
        {!hasKey && !result && !isLoading && (
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

        {result ? (
          <ResultScreen result={result} imageUrls={images} onNewEssay={handleNew} />
        ) : (
          <CaptureScreen
            onGrade={handleGrade}
            isLoading={isLoading}
            loadingStepText={stepText}
            error={error}
            onDismissError={() => setError(null)}
            onRetry={() => lastSubmission && handleGrade(lastSubmission)}
            canRetry={Boolean(lastSubmission)}
          />
        )}
      </main>

      <HistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={history}
        onSelect={(rec) => {
          setResult(rec.gradingResult);
          setImages(rec.imageUrls);
          setError(null);
          setHistoryOpen(false);
        }}
        onDelete={async (id) => {
          await deleteGradedEssayFromIndexedDB(id);
          setHistory(await getAllGradedEssaysFromIndexedDB());
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
          if (next.apiKey) setError(null);
        }}
      />
    </div>
  );
}
