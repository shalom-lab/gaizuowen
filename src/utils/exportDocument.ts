import { StoredEssayRecord } from './indexedDb';
import { AnnotationItem, AnnotationType, EssayGradingResult } from '../types';

const INK: Record<AnnotationType, string> = {
  typo: '#b91c1c',
  grammar: '#c2410c',
  punctuation: '#7e22ce',
  highlight: '#b45309',
};

const TYPE_LABEL: Record<AnnotationType, string> = {
  typo: '错别字',
  grammar: '病句',
  punctuation: '标点',
  highlight: '好句',
};

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 40) || '批注单';
}

function renderAnnotatedHtml(text: string, anns: AnnotationItem[]): string {
  const items = [...anns]
    .filter((a) => typeof a.charStart === 'number' && typeof a.charEnd === 'number')
    .sort((a, b) => (a.charStart as number) - (b.charStart as number));

  if (items.length === 0) return esc(text);

  let html = '';
  let cursor = 0;
  for (const a of items) {
    const s = a.charStart as number;
    const e = a.charEnd as number;
    if (s < cursor || e > text.length) continue;
    if (s > cursor) html += esc(text.slice(cursor, s));
    const color = INK[a.type];
    const wavy = a.type === 'highlight';
    const mark = a.suggestedText
      ? `〔→${esc(a.suggestedText)}〕`
      : `〔${esc(a.category || '好句')}〕`;
    html += `<span style="text-decoration:underline;text-decoration-color:${color};text-decoration-thickness:2px;text-underline-offset:2px;${
      wavy ? 'text-decoration-style:wavy;' : ''
    }">${esc(text.slice(s, e))}</span><span style="color:${color};font-size:11px">${mark}<sup>${
      a.order ?? ''
    }</sup></span>`;
    cursor = e;
  }
  if (cursor < text.length) html += esc(text.slice(cursor));
  return html;
}

function sheetHtml(r: EssayGradingResult): string {
  const byParagraph = new Map<number, AnnotationItem[]>();
  for (const a of r.annotations) {
    const k = a.paragraphIndex ?? 0;
    if (!byParagraph.has(k)) byParagraph.set(k, []);
    byParagraph.get(k)!.push(a);
  }
  const ordered = [...r.annotations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const paras = r.paragraphs
    .map(
      (p) =>
        `<p style="font-size:13px;line-height:1.9;text-align:justify;margin:0 0 12px">${renderAnnotatedHtml(
          p.text,
          byParagraph.get(p.paragraphIndex) || []
        )}</p>`
    )
    .join('');

  const rows = ordered
    .map((a) => {
      const color = INK[a.type];
      const fix = a.suggestedText
        ? `<span style="text-decoration:line-through;color:${color}">${esc(a.originalText)}</span> → <b>${esc(
            a.suggestedText
          )}</b>`
        : `<b style="color:${color}">${esc(a.originalText)}</b>`;
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;color:${color};font-weight:700">${a.order ?? ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;color:${color};font-weight:600;white-space:nowrap">${esc(
          a.category || TYPE_LABEL[a.type]
        )}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px">${fix}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;color:#334155">${esc(a.explanation)}</td>
      </tr>`;
    })
    .join('');

  return `<article style="page-break-after:always;padding:28px 24px;margin-bottom:24px;background:#fff;border:1px solid #e2e8f0;border-radius:8px">
    <h1 style="text-align:center;font-size:20px;margin:0 0 8px">《${esc(r.title)}》批注单</h1>
    <p style="text-align:center;font-size:12px;color:#475569;margin:0 0 16px">
      学生：${esc(r.studentName || '同学')} · 年级：${esc(r.gradeLevel)} · 字数：${r.wordCount} ·
      <b>${r.overallScore} 分（${esc(r.letterGrade)}）</b>
    </p>
    <h2 style="font-size:14px;border-left:4px solid #334155;padding-left:8px;margin:0 0 8px">一、原文与批注</h2>
    ${paras}
    <h2 style="font-size:14px;border-left:4px solid #334155;padding-left:8px;margin:20px 0 8px">二、批注明细（共 ${
      r.annotations.length
    } 处）</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="background:#f1f5f9">
        <th style="border:1px solid #cbd5e1;padding:6px 8px;width:32px">#</th>
        <th style="border:1px solid #cbd5e1;padding:6px 8px;width:64px;text-align:left">类型</th>
        <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:left">原文 → 修改</th>
        <th style="border:1px solid #cbd5e1;padding:6px 8px;text-align:left">批语</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2 style="font-size:14px;border-left:4px solid #334155;padding-left:8px;margin:20px 0 8px">三、总评</h2>
    <p style="font-size:13px;line-height:1.9;border:1px solid #cbd5e1;border-radius:6px;padding:12px;background:#f8fafc;margin:0">${esc(
      r.summaryComment
    )}</p>
  </article>`;
}

/** Build a self-contained HTML document the teacher can keep on her phone. */
export function buildExportHtml(records: StoredEssayRecord[]): string {
  const sheets = records
    .map((rec) => (rec.gradingResult ? sheetHtml(rec.gradingResult) : ''))
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>作文批注单</title>
<style>
  body { margin: 0; padding: 16px; font-family: "PingFang SC","Microsoft YaHei",sans-serif; background: #f1f5f9; color: #0f172a; }
  @media (min-width: 720px) { body { padding: 24px; } .wrap { max-width: 720px; margin: 0 auto; } }
</style>
</head>
<body><div class="wrap">${sheets}</div></body>
</html>`;
}

export function exportFileName(records: StoredEssayRecord[]): string {
  if (records.length === 1) {
    const t = records[0].gradingResult?.title || records[0].title || '作文';
    return `${safeFileName(`批注单-${t}`)}.html`;
  }
  return `${safeFileName(`批注单-${records.length}篇`)}.html`;
}

export type SaveExportResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Save the annotation sheet as a real file on the phone.
 * Prefers the system share sheet (iOS/Android "存储到文件"), else triggers a download.
 */
export async function saveExportFile(records: StoredEssayRecord[]): Promise<SaveExportResult> {
  if (records.length === 0) return 'failed';

  const html = buildExportHtml(records);
  const name = exportFileName(records);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const file = new File([blob], name, { type: 'text/html' });

  try {
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: '作文批注单', text: name });
      return 'shared';
    }
  } catch (err: any) {
    // User dismissed the share sheet — not an error.
    if (err?.name === 'AbortError') return 'cancelled';
    /* fall through to download */
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so Safari can start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
