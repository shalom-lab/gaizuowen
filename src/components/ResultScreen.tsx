import React, { useMemo, useState } from 'react';
import { Star, Copy, Check, Image as ImageIcon, FileDown } from 'lucide-react';
import { EssayGradingResult } from '../types';
import { TYPE_META } from '../utils/annotationMeta';
import { scoreStyle } from '../utils/scoreStyle';
import { AnnotatedEssay } from './AnnotatedEssay';
import { PhotoViewer } from './PhotoViewer';

interface ResultScreenProps {
  result: EssayGradingResult;
  imageUrls: string[];
  onNewEssay: () => void;
  /** Export this essay as a printable annotation sheet. */
  onExport: () => void;
}

/**
 * The deliverable view: the pupil's own text, unedited, with each correction
 * shown in a bracket right beside the mistake — plus the single 80-100 char
 * overall comment. Nothing else, so it reads straight down the page.
 */
export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  imageUrls,
  onNewEssay,
  onExport,
}) => {
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of result.annotations) c[a.type] = (c[a.type] || 0) + 1;
    return c;
  }, [result.annotations]);

  const score = scoreStyle(result.overallScore, result.letterGrade);

  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const copyComment = async () => {
    if (await copyText(result.summaryComment)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="px-4 pt-4 pb-28">
      {/* ---- Title + score: stack cleanly on a narrow phone ---- */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-900 leading-snug break-words">
            《{result.title}》
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed flex flex-wrap gap-x-1.5 gap-y-0.5">
            <span>{result.gradeLevel}</span>
            <span className="text-slate-300">·</span>
            <span>{result.studentName || '同学'}</span>
            <span className="text-slate-300">·</span>
            <span>{result.wordCount} 字</span>
            <span className="text-slate-300">·</span>
            <span>{result.annotations.length} 处批注</span>
          </p>
        </div>
        <div
          className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-center min-w-[3.25rem] ${score.bg} ${score.border}`}
        >
          <div className={`text-xl font-black leading-none tabular-nums ${score.text}`}>
            {result.overallScore}
          </div>
          <div className={`text-[10px] font-semibold mt-0.5 ${score.text}`}>{result.letterGrade}</div>
        </div>
      </div>

      {/* ---- Counts on their own wrapping row; export below on small screens ---- */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {(['typo', 'grammar', 'punctuation', 'highlight'] as const)
            .filter((t) => counts[t])
            .map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className={`${TYPE_META[t].textClass} px-1 rounded`}>{TYPE_META[t].label}</span>
                <span className="tabular-nums">{counts[t]}</span>
              </span>
            ))}
        </div>
        <button
          onClick={onExport}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 active:scale-[0.99]"
        >
          <FileDown className="w-3.5 h-3.5" />
          导出
        </button>
      </div>

      {/* ---- The annotated essay: read straight down ---- */}
      <AnnotatedEssay paragraphs={result.paragraphs} annotations={result.annotations} />

      {/* ---- The one long comment ---- */}
      <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span className="text-sm font-bold text-amber-900">总评</span>
            <span className="text-[11px] text-amber-700/80">{result.summaryComment.length} 字</span>
          </div>
          <button
            onClick={copyComment}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-medium active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <p className="text-[15px] text-slate-800 leading-loose font-serif break-words">
          {result.summaryComment}
        </p>
      </div>

      {/* ---- Original photos ---- */}
      {imageUrls.length > 0 && (
        <button
          onClick={() => setPhotosOpen(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-600 active:bg-slate-50"
        >
          <ImageIcon className="w-4 h-4 text-slate-400" />
          对照原图（{imageUrls.length} 页）
        </button>
      )}

      {/* ---- Sticky action ---- */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onNewEssay}
            className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-base shadow-lg shadow-rose-200 active:scale-[0.98] transition-transform"
          >
            批改下一篇
          </button>
        </div>
      </div>

      {photosOpen && (
        <PhotoViewer
          imageUrls={imageUrls}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          onClose={() => setPhotosOpen(false)}
        />
      )}
    </div>
  );
};
