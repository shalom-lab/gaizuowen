import React, { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { StoredEssayRecord } from '../utils/indexedDb';
import { AnnotationItem, AnnotationType } from '../types';
import { TYPE_META } from '../utils/annotationMeta';
import { scoreStyle } from '../utils/scoreStyle';

interface ExportPreviewProps {
  records: StoredEssayRecord[];
  onClose: () => void;
}

/**
 * Print-specific colour, kept separate from TYPE_META.
 *
 * TYPE_META paints on-screen highlight backgrounds; on paper those become muddy
 * grey blocks on a school laser printer. Here colour is used on *text and thin
 * rules* instead, so the sheet stays readable in black and white while still
 * being scannable in colour — and it reuses the same hue the teacher sees on her
 * phone and draws on the pupil's paper.
 */
const EXPORT_INK: Record<AnnotationType, { text: string; rule: string; wavy: boolean }> = {
  typo: { text: 'text-red-700', rule: 'decoration-red-600', wavy: false },
  grammar: { text: 'text-orange-700', rule: 'decoration-orange-500', wavy: false },
  punctuation: { text: 'text-purple-700', rule: 'decoration-purple-500', wavy: false },
  highlight: { text: 'text-amber-700', rule: 'decoration-amber-500', wavy: true },
};

/**
 * Printable annotation document for one or more essays.
 *
 * Print-to-PDF rather than a JS PDF library: the text stays real vector text
 * with correct Chinese glyphs (no 5-10 MB embedded CJK font, no rasterising),
 * and the browser's "save as PDF" does the rest. One essay per page.
 */
export const ExportPreview: React.FC<ExportPreviewProps> = ({ records, onClose }) => {
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
          <div className="text-xs text-slate-500 text-center min-w-0">共 {records.length} 篇 · 每篇一页</div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            打印 / 存为 PDF
          </button>
        </div>
        <p className="max-w-2xl mx-auto mt-2 text-[11px] text-slate-400 leading-relaxed no-print">
          在弹出的打印窗口里,把「目标 / 打印机」选为「另存为 PDF」即可。
          若想保留颜色,请在打印选项里勾选「背景图形 / Background graphics」。
        </p>
      </div>

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

  const score = scoreStyle(r.overallScore, r.letterGrade);

  const byParagraph = new Map<number, AnnotationItem[]>();
  for (const a of r.annotations) {
    const k = a.paragraphIndex ?? 0;
    if (!byParagraph.has(k)) byParagraph.set(k, []);
    byParagraph.get(k)!.push(a);
  }

  const ordered = [...r.annotations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const kinds: AnnotationType[] = ['typo', 'grammar', 'punctuation', 'highlight'];
  const present = kinds.filter((t) => r.annotations.some((a) => a.type === t));

  return (
    <section
      className="bg-white rounded-xl shadow-sm p-8 mb-4 print:shadow-none print:rounded-none print:mb-0 print:break-after-page"
      style={{ breakAfter: index === total - 1 ? 'auto' : 'page' }}
    >
      {/* ---- Title ---- */}
      <header className="border-b-2 border-slate-800 pb-3 mb-3">
        <h1 className="text-xl font-bold text-slate-900 text-center tracking-wide">
          《{r.title}》批注单
        </h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span>学生：{r.studentName || '同学'}</span>
          <span>年级：{r.gradeLevel}</span>
          <span>字数：{r.wordCount}</span>
          {r.pageCount ? <span>页数：{r.pageCount}</span> : null}
          {/* Colour-coded score: green / amber / red by how good it is. */}
          <span className={`px-2 py-0.5 rounded border font-bold ${score.bg} ${score.text} ${score.border}`}>
            {r.overallScore} 分（{r.letterGrade}）
          </span>
        </div>
      </header>

      {/* ---- Colour legend ---- */}
      {present.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">色标：</span>
          {present.map((t) => (
            <span key={t} className={`font-semibold ${EXPORT_INK[t].text}`}>
              {EXPORT_INK[t].wavy ? '〰 ' : '— '}
              {TYPE_META[t].label}
            </span>
          ))}
          <span className="text-slate-400">（原文一字未改，〔→〕内为修改建议）</span>
        </div>
      )}

      {/* ---- Annotated transcript ---- */}
      <section className="mb-5">
        <h2 className="text-sm font-bold text-slate-800 mb-2 pl-2 border-l-4 border-slate-700">
          一、原文与批注
        </h2>
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
        <h2 className="text-sm font-bold text-slate-800 mb-2 pl-2 border-l-4 border-slate-700">
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
            {ordered.map((a) => {
              const ink = EXPORT_INK[a.type];
              const isPraise = a.type === 'highlight';
              return (
                <tr
                  key={a.id}
                  className="align-top"
                  // Praise rows get a faint tint so good writing stands out when
                  // skimming; errors stay plain so the page is not noisy.
                  style={isPraise ? { backgroundColor: '#fffbeb' } : undefined}
                >
                  <td className={`border border-slate-300 px-2 py-1.5 text-center font-bold ${ink.text}`}>
                    {a.order}
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 whitespace-nowrap font-semibold ${ink.text}`}>
                    {a.category || TYPE_META[a.type].label}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5">
                    {a.suggestedText ? (
                      <>
                        <span className={`line-through ${ink.text}`}>{a.originalText}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="font-bold text-slate-900">{a.suggestedText}</span>
                      </>
                    ) : (
                      <span className={`font-bold ${ink.text}`}>{a.originalText}</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-700">{a.explanation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ---- Overall comment ---- */}
      <section>
        <h2 className="text-sm font-bold text-slate-800 mb-2 pl-2 border-l-4 border-slate-700">三、总评</h2>
        <p className="text-[13px] leading-[1.9] text-slate-800 border border-slate-300 rounded p-3 bg-slate-50/60">
          {r.summaryComment}
        </p>
      </section>
    </section>
  );
};

/**
 * Inline transcript: original text kept, correction in a bracket.
 * Marks use the same pen convention as the app — straight coloured rule for
 * something to fix, gold wavy rule for a sentence worth praising.
 */
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

    const ink = EXPORT_INK[a.type];
    nodes.push(
      <span key={a.id}>
        <span
          className={`underline decoration-2 underline-offset-2 ${ink.rule} ${ink.wavy ? 'decoration-wavy' : ''}`}
        >
          {text.slice(s, e)}
        </span>
        <span className={`text-[11px] ${ink.text}`}>
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
