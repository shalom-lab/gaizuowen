// Regenerates scripts/fixture-result.json from the real photos in ./test.
// Gives the UI tests and the static preview genuine model output to work with.
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

const testDir = path.join(ROOT, 'test');
const files = fs.readdirSync(testDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
if (!files.length) {
  console.error('no images in ./test');
  process.exit(1);
}

const images = files.map((f) => ({
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

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
console.log(`grading ${images.length} page(s) with ${MODEL}...`);

const res = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    max_tokens: 48000,
  }),
});

const raw = await res.text();
if (!res.ok) {
  console.error('HTTP ' + res.status, raw.slice(0, 600));
  process.exit(1);
}

const json = JSON.parse(raw);
const parsed = JSON.parse(json.choices[0].message.content);
const result = normalizeResult(parsed, { gradeLevel: '六年级', studentName: '林小羽', pageCount: images.length });

const out = path.join(__dirname, 'fixture-result.json');
fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');

let anchored = 0;
for (const a of result.annotations) {
  const p = result.paragraphs[a.paragraphIndex ?? 0];
  if (p && p.text.substring(a.charStart, a.charEnd) === a.originalText) anchored++;
}

console.log('saved ' + out);
console.log('  title       ' + result.title);
console.log('  score       ' + result.overallScore + ' ' + result.letterGrade);
console.log('  paragraphs  ' + result.paragraphs.length);
console.log('  annotations ' + result.annotations.length + ' (anchored ' + anchored + ')');
console.log('  summary     ' + result.summaryComment.length + ' chars');
console.log('  usage       ' + JSON.stringify(json.usage));
