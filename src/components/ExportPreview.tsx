import React, { useEffect, useState } from 'react';
import { Download, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { StoredEssayRecord } from '../utils/indexedDb';
import { AnnotationItem, AnnotationType } from '../types';
import { TYPE_META } from '../utils/annotationMeta';
import { scoreStyle } from '../utils/scoreStyle';
import { saveExportFile } from '../utils/exportDocument';

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
 * Annotation document preview + save-as-file.
 *
 * Mobile browsers often ignore or bury window.print(), so the primary action
 * writes a real .html file via the share sheet / download — no print dialog.
 * The on-screen sheets remain for a quick look before saving.
 */
export const ExportPreview: React.FC<ExportPreviewProps> = ({ records, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    document.body.classList.add('printing-document');
    return () => document.body.classList.remove('printing-document');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const result = await saveExportFile(records);
      if (result === 'shared') {
        setStatus({ ok: true, msg: '已打开系统分享，可选「存储到文件」保存到手机' });
      } else if (result === 'downloaded') {
        setStatus({ ok: true, msg: '已开始下载批注单文件' });
      } else if (result === 'cancelled') {
        setStatus(null);
      } else {
        setStatus({ ok: false, msg: '保存失败，请再试一次' });
      }
    } catch {
      setStatus({ ok: false, msg: '保存失败，请再试一次' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="app-shell flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 active:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="text-xs text-slate-500 text-center min-w-0">共 {records.length} 篇</div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-sm active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {saving ? '保存中…' : '保存文件'}
          </button>
        </div>
        <p className="app-shell mt-2 text-[11px] text-slate-400 leading-relaxed">
          点「保存文件」存到手机。若当前在微信里点了没反应，可换 Chrome 打开后再保存。
        </p>
        {status && (
          <div
            className={`app-shell mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed p-2.5 rounded-lg ${
              status.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.ok ? (
              <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            {status.msg}
          </div>
        )}
      </div>

      <div className="app-shell p-4 print:p-0 print:max-w-none">
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
