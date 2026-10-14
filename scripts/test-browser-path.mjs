// Exercises the exact code path the BROWSER uses: shared/deepseek.mjs called
// directly with a BYOK key, then shared/normalize.mjs. No backend involved.
//
// Simulates the browser by sending an Origin header, proving CORS works and
// that a static GitHub Pages build can grade for real.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const { buildGradingPrompt } = await import('../shared/prompts.mjs');
const { normalizeResult } = await import('../shared/normalize.mjs');
const { extractJson, formatErrorMessage } = await import('../shared/deepseek.mjs');

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
// A browser origin, to confirm the CORS path the static site will use.
const ORIGIN = 'https://zuowen.github.io';

console.log(`model  : ${MODEL}`);
console.log(`origin : ${ORIGIN}  (simulating the browser)`);

const testDir = path.join(ROOT, 'test');
const files = fs.existsSync(testDir)
  ? fs.readdirSync(testDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()
  : [];

if (files.length === 0) {
  // Student photos are intentionally not committed. Skip cleanly so CI and
  // fresh clones do not fail on a missing fixture.
  console.log('\nSKIP: no photos in ./test');
  console.log('Put 1-4 photos of a handwritten essay there, then re-run:');
  console.log('  npm run test:api');
  process.exit(0);
}

const images = files.map((f) => ({
  name: f,
  mimeType: 'image/jpeg',
  base64: fs.readFileSync(path.join(testDir, f)).toString('base64'),
}));

const content = [];
images.forEach((img, i) => {
  if (images.length > 1) content.push({ type: 'text', text: `【第 ${i + 1} 页 / 共 ${images.length} 页】` });
  content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
});
content.push({
  type: 'text',
  text: buildGradingPrompt({ gradeLevel: '六年级', studentName: '林小羽', pageCount: images.length }),
});

const t0 = Date.now();
const res = await fetch(`${BASE}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    Origin: ORIGIN, // browser-like request
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    max_tokens: 48000,
  }),
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\nHTTP ${res.status} in ${elapsed}s`);
console.log('ACAO  :', res.headers.get('access-control-allow-origin') || '(absent)');

const raw = await res.text();
if (!res.ok) {
  console.log(formatErrorMessage(new Error(`HTTP ${res.status}: ${raw.slice(0, 400)}`)));
  process.exit(1);
}

const json = JSON.parse(raw);
const choice = json.choices?.[0] || {};
console.log('finish:', choice.finish_reason, ' usage:', JSON.stringify(json.usage));

const { data: parsed, truncated } = extractJson(choice.message?.content || '');
if (truncated) console.log('note  : response was truncated and salvaged');

const result = normalizeResult(parsed, { gradeLevel: '六年级', studentName: '林小羽', pageCount: images.length });

// ---- contract assertions the UI depends on ----
const problems = [];
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  [${extra}]` : ''}`);
  if (!cond) problems.push(name);
};

let anchored = 0;
for (const a of result.annotations) {
  const p = result.paragraphs[a.paragraphIndex ?? 0];
  if (p && typeof a.charStart === 'number' && p.text.substring(a.charStart, a.charEnd) === a.originalText) anchored++;
}

console.log('\n================ CONTRACT ================');
ok('title present & meaningful', Boolean(result.title) && result.title !== '无题', result.title);
ok('score within 0-100', result.overallScore >= 0 && result.overallScore <= 100, String(result.overallScore));
ok('summary 80-100 chars', result.summaryComment.length >= 80 && result.summaryComment.length <= 100, `${result.summaryComment.length}`);
ok('paragraphs >= 4', result.paragraphs.length >= 4, String(result.paragraphs.length));
ok('annotations >= 8', result.annotations.length >= 8, String(result.annotations.length));
ok('CORS ACAO echoed', Boolean(res.headers.get('access-control-allow-origin')));
ok(
  'dimension scores sum to overall',
  Object.values(result.dimensionScores).reduce((s, d) => s + d.score, 0) === result.overallScore
);
ok('all anchors exact (100%)', anchored === result.annotations.length, `${anchored}/${result.annotations.length}`);
ok('notes short enough to copy', result.annotations.every((a) => a.explanation.length <= 40),
   `max ${Math.max(...result.annotations.map((a) => a.explanation.length))}`);
ok('no praise type', !result.annotations.some((a) => a.type === 'praise'));
ok('no upgradedEssay payload', result.upgradedEssay === undefined);

console.log('\n--- annotated sample (as the page will show it) ---');
result.paragraphs.forEach((p, i) => {
  const anns = result.annotations.filter((a) => a.paragraphIndex === p.paragraphIndex);
  let out = p.text;
  // Insert brackets back-to-front so offsets stay valid.
  [...anns].sort((a, b) => b.charStart - a.charStart).forEach((a) => {
    const label = a.suggestedText ? `〔→${a.suggestedText}〕` : `〔${a.category}〕`;
    out = out.slice(0, a.charEnd) + label + out.slice(a.charEnd);
  });
  console.log(`[${i}] ${out}`);
});

console.log('\n--- 总评 ---');
console.log(result.summaryComment);

console.log(problems.length ? `\n${problems.length} CONTRACT FAILURE(S)` : `\nALL CHECKS PASSED (${elapsed}s)`);
process.exit(problems.length ? 1 : 0);
