import React, { useMemo, useState } from 'react';
import { Star, Copy, Check, Image as ImageIcon, X, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { EssayGradingResult, AnnotationItem } from '../types';
import { TYPE_META } from '../utils/annotationMeta';
import { AnnotatedEssay } from './AnnotatedEssay';

interface ResultScreenProps {
  result: EssayGradingResult;
  imageUrls: string[];
  onNewEssay: () => void;
}

/**
 * The deliverable view: the pupil's own text, unedited, with each correction
 * shown in a bracket right beside the mistake — plus the single 80-100 char
 * overall comment. Nothing else, so it reads straight down the page.
 */
export const ResultScreen: React.FC<ResultScreenProps> = ({ result, imageUrls, onNewEssay }) => {
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of result.annotations) c[a.type] = (c[a.type] || 0) + 1;
    return c;
  }, [result.annotations]);

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

  /** Plain numbered list — for pasting into a class group or a grading record. */
  const buildChecklist = () => {
    const lines: string[] = [`《${result.title}》`, ''];
    const byParagraph = new Map<number, AnnotationItem[]>();
    for (const a of result.annotations) {
      const k = a.paragraphIndex ?? 0;
      if (!byParagraph.has(k)) byParagraph.set(k, []);
      byParagraph.get(k)!.push(a);
    }
    for (const [pIdx, list] of [...byParagraph.entries()].sort((x, y) => x[0] - y[0])) {
      lines.push(`第 ${pIdx + 1} 段`);
      for (const a of list.sort((x, y) => (x.order ?? 0) - (y.order ?? 0))) {
        const fix = a.suggestedText ? `${a.originalText} → ${a.suggestedText}` : `${a.originalText}（${a.category}）`;
        lines.push(`${a.order}. ${fix}  ${a.explanation}`);
      }
      lines.push('');
    }
    lines.push('总评', result.summaryComment);
    return lines.join('\n').trim();
  };

  const copyAll = async () => {
    if (await copyText(buildChecklist())) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    }
  };

  return (
    <div className="px-4 pt-4 pb-28">
      {/* ---- Title bar ---- */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 leading-snug">《{result.title}》</h1>
          <p className="text-xs text-slate-500 mt-1">
            {result.gradeLevel} · {result.studentName || '同学'} · {result.wordCount} 字 ·{' '}
            {result.annotations.length} 处批注
          </p>
        </div>
      </div>

      {/* ---- Legend + copy checklist ---- */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
          {(['typo', 'grammar', 'punctuation', 'highlight'] as const)
            .filter((t) => counts[t])
            .map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-2 h-2 rounded-full ${TYPE_META[t].dotClass}`} />
                {TYPE_META[t].label} {counts[t]}
              </span>
            ))}
        </div>
        <button
          onClick={copyAll}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 active:scale-95"
        >
          {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <ClipboardList className="w-3 h-3" />}
          {copiedAll ? '已复制' : '复制清单'}
        </button>
      </div>

      {/* ---- The annotated essay: read straight down ---- */}
      <AnnotatedEssay paragraphs={result.paragraphs} annotations={result.annotations} />

      {/* ---- The one long comment ---- */}
      <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-amber-900">总评</span>
            <span className="text-[11px] text-amber-700/80">{result.summaryComment.length} 字</span>
          </div>
          <button
            onClick={copyComment}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-medium active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <p className="text-[15px] text-slate-800 leading-loose font-serif">{result.summaryComment}</p>
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
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
            <span className="text-sm font-bold">
              原图 {photoIndex + 1} / {imageUrls.length}
            </span>
            <button onClick={() => setPhotosOpen(false)} className="p-1.5 rounded-full bg-white/15">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <img src={imageUrls[photoIndex]} alt="" className="max-w-full max-h-full object-contain" />
          </div>
          {imageUrls.length > 1 && (
            <div className="flex items-center justify-center gap-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
              <button
                onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                disabled={photoIndex === 0}
                className="p-2.5 rounded-full bg-white/15 text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex gap-1.5">
                {imageUrls.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPhotoIndex((i) => Math.min(imageUrls.length - 1, i + 1))}
                disabled={photoIndex === imageUrls.length - 1}
                className="p-2.5 rounded-full bg-white/15 text-white disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
