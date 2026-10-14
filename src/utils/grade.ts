/**
 * Client-side grading pipeline. No backend involved:
 *   images -> buildGradingPrompt -> DeepSeek (BYOK) -> normalizeResult
 * The prompt and normalizer are the same modules the local test harness uses,
 * so what passes the harness is what ships.
 */
import { buildGradingPrompt, buildReEvaluatePrompt } from '../../shared/prompts.mjs';
import { normalizeResult } from '../../shared/normalize.mjs';
import { callDeepSeek, DEFAULT_MODEL, DEFAULT_MAX_TOKENS } from '../../shared/deepseek.mjs';
import { EssayGradingResult } from '../types';

export interface GradeImage {
  dataUrl: string;
  name?: string;
}

export interface GradeRequest {
  images: GradeImage[];
  gradeLevel: string;
  studentName: string;
  promptHint?: string;
  essayTitle?: string;
}

export interface GradeResponse {
  result: EssayGradingResult;
  truncated: boolean;
  elapsedMs: number;
  usage?: any;
}

/**
 * Split a data: URL into its media type and payload.
 * DeepSeek accepts a data URL directly, but re-deriving the mime type keeps the
 * request honest when the source was a PNG or WEBP.
 */
function toImagePart(dataUrl: string) {
  const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (m) return { mimeType: m[1], base64: m[2] };
  return { mimeType: 'image/jpeg', base64: dataUrl };
}

export async function gradeEssay(
  req: GradeRequest,
  opts: { apiKey: string; baseUrl?: string; model?: string; signal?: AbortSignal }
): Promise<GradeResponse> {
  const { images, gradeLevel, studentName, promptHint = '', essayTitle = '' } = req;

  if (!images.length) throw new Error('请至少上传一张作文照片。');
  if (images.length > 20) throw new Error(`一次最多批改 20 页，当前 ${images.length} 页。`);

  const content: any[] = [];
  images.forEach((img, i) => {
    if (images.length > 1) {
      content.push({ type: 'text', text: `【第 ${i + 1} 页 / 共 ${images.length} 页】` });
    }
    const { mimeType, base64 } = toImagePart(img.dataUrl);
    content.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } });
  });
  content.push({
    type: 'text',
    text: buildGradingPrompt({
      gradeLevel,
      studentName,
      pageCount: images.length,
      promptHint,
      essayTitle,
    }),
  });

  const { parsed, truncated, usage, elapsedMs } = await callDeepSeek({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    model: opts.model || DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content }],
    signal: opts.signal,
  });

  const result = normalizeResult(parsed, {
    gradeLevel,
    studentName,
    pageCount: images.length,
  }) as EssayGradingResult;

  return { result, truncated, elapsedMs, usage };
}

/** Re-grade after the teacher corrects an OCR mistake. */
export async function reEvaluate(
  params: { text: string; gradeLevel: string; title: string; studentName?: string; pageCount?: number },
  opts: { apiKey: string; baseUrl?: string; model?: string; signal?: AbortSignal }
): Promise<EssayGradingResult> {
  if (!params.text || !params.text.trim()) throw new Error('作文正文不能为空。');

  const { parsed } = await callDeepSeek({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    model: opts.model || DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content: buildReEvaluatePrompt(params) }],
    signal: opts.signal,
  });

  const paragraphs = params.text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ paragraphIndex: i, text }));

  return normalizeResult(
    { ...parsed, paragraphs },
    {
      gradeLevel: params.gradeLevel,
      studentName: params.studentName || '同学',
      pageCount: params.pageCount || 1,
    }
  ) as EssayGradingResult;
}
