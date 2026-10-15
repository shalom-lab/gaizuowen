import React, { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { StoredEssayRecord } from '../utils/indexedDb';
import { AnnotationItem } from '../types';
import { TYPE_META } from '../utils/annotationMeta';

interface ExportPreviewProps {
  records: StoredEssayRecord[];
  onClose: () => void;
}

/**
 * Printable annotation document for one or more essays.
 *
 * Deliberately print-to-PDF rather than a JS PDF library: the text stays real
 * vector text with correct Chinese glyphs (no 5-10 MB embedded CJK font, no
 * canvas rasterisation), and the browser's own "save as PDF" does the rest.
 *
 * One essay per page, with a page break between.
 */
export const ExportPreview: React.FC<ExportPreviewProps> = ({ records, onClose }) => {
  // Hide the app chrome while printing so only the document lands on the page.
  useEffect(() => {
    document.body.classList.add('printing-document');
    return () => document.body.classList.remove('printing-document');
  }, []);

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Controls — excluded from the printout via .no-print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 active:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="text-xs text-slate-500 text-center min-w-0">
            共 {records.length} 篇 · 每篇一页
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            打印 / 存为 PDF
          </button>
        </div>
        <p className="max-w-2xl mx-auto mt-2 text-[11px] text-slate-400 leading-relaxed no-print">
          在弹出的打印窗口里,选择「目标 / 打印机」为「另存为 PDF」,即可得到 PDF 文件。
        </p>
      </div>

      {/* The document itself */}
      <div className="max-w-2xl mx-auto p-4 print:p-0 print:max-w-none">
        {records.map((rec, idx) => (
          <EssaySheet key={rec.id} record={rec} index={idx} total={records.length} />
        ))}
      </div>
    </div>
  );
};

const EssaySheet: React.FC<{ record: StoredEssayRecord; index: number; total: number }> = ({
  record,
  index,
  total,
}) => {
  const r = record.gradingResult;
  if (!r) return null;

  const byParagraph = new Map<number, AnnotationItem[]>();
  for (const a of r.annotations) {
    const k = a.paragraphIndex ?? 0;
    if (!byParagraph.has(k)) byParagraph.set(k, []);
    byParagraph.get(k)!.push(a);
  }

  return (
    <section
      className="bg-white rounded-xl shadow-sm p-8 mb-4 print:shadow-none print:rounded-none print:mb-0 print:break-after-page"
      style={{ breakAfter: index === total - 1 ? 'auto' : 'page' }}
    >
      {/* ---- Title ---- */}
      <header className="border-b-2 border-slate-800 pb-3 mb-4">
        <h1 className="text-xl font-bold text-slate-900 text-center tracking-wide">
          《{r.title}》批注单
        </h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span>学生：{r.studentName || '同学'}</span>
          <span>年级：{r.gradeLevel}</span>
          <span>字数：{r.wordCount}</span>
          {r.pageCount ? <span>页数：{r.pageCount}</span> : null}
          <span>
            评分：{r.overallScore} 分（{r.letterGrade}）
          </span>
        </div>
      </header>

      {/* ---- Annotated transcript ---- */}
      <section className="mb-5">
        <h2 className="text-sm font-bold text-slate-800 mb-2">一、原文与批注</h2>
        <p className="text-[10px] text-slate-500 mb-3">
          原文未作改动,〔→　〕内为修改建议;带编号的批注见下表。
        </p>
        <div className="space-y-3">
          {r.paragraphs.map((p) => (
            <p key={p.paragraphIndex} className="text-[13px] leading-[1.9] text-slate-800 text-justify">
              {renderAnnotated(p.text, byParagraph.get(p.paragraphIndex) || [])}
            </p>
          ))}
        </div>
      </section>

      {/* ---- Annotation table ---- */}
      <section className="mb-5">
        <h2 className="text-sm font-bold text-slate-800 mb-2">
          二、批注明细（共 {r.annotations.length} 处）
        </h2>
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-300 px-2 py-1.5 w-8">#</th>
              <th className="border border-slate-300 px-2 py-1.5 w-16 text-left">类型</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">原文 → 修改</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">批语</th>
            </tr>
          </thead>
          <tbody>
            {[...r.annotations]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{a.order}</td>
                  <td className="border border-slate-300 px-2 py-1.5 whitespace-nowrap">
                    {a.category || TYPE_META[a.type].label}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">
                    {a.suggestedText ? (
                      <>
                        <span className="text-slate-500 line-through">{a.originalText}</span>
                        <span className="mx-1">→</span>
                        <span className="font-bold text-slate-900">{a.suggestedText}</span>
                      </>
                    ) : (
                      <span className="font-bold text-slate-900">{a.originalText}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-700">{a.explanation}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* ---- Overall comment, with room to write by hand ---- */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 mb-2">三、总评</h2>
        <p className="text-[13px] leading-[1.9] text-slate-800 border border-slate-300 rounded p-3">
          {r.summaryComment}
        </p>
      </section>
    </section>
  );
};

/** Inline transcript: original text kept, correction in a bracket. */
function renderAnnotated(text: string, anns: AnnotationItem[]): React.ReactNode {
  const items = [...anns]
    .filter((a) => typeof a.charStart === 'number' && typeof a.charEnd === 'number')
    .sort((a, b) => (a.charStart as number) - (b.charStart as number));

  if (items.length === 0) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const a of items) {
    const s = a.charStart as number;
    const e = a.charEnd as number;
    if (s < cursor || e > text.length) continue;
    if (s > cursor) nodes.push(text.slice(cursor, s));

    nodes.push(
      <span key={a.id}>
        <span className="underline decoration-slate-700">{text.slice(s, e)}</span>
        <span className="text-slate-600 text-[11px]">
          {a.suggestedText ? `〔→${a.suggestedText}〕` : `〔${a.category || '好句'}〕`}
          <sup>{a.order}</sup>
        </span>
      </span>
    );
    cursor = e;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
