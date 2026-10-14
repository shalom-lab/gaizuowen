// Guards against a real corruption mode hit during development:
// round-tripping a UTF-8 (no BOM) file through a shell whose default encoding is
// GBK turns 错别字 into 閿欏埆瀛 — which is still *valid UTF-8*, so a naive
// "is this valid UTF-8?" check passes and the damage ships.
//
// This scan looks for characters that only appear in that mojibake, and also
// verifies a few must-exist strings.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.npm-cache', 'test', 'docs']);
const EXTS = /\.(ts|tsx|mjs|js|css|md|json|html|yml|yaml|py)$/;

/**
 * Characters produced when UTF-8 Chinese is decoded as GBK. These are rare or
 * absent in ordinary Simplified Chinese prose, so a hit is a strong signal.
 */
const MOJIBAKE_TELLS = new Set([
  ...'閿鐥鏍濂鈶娉鍙鐨涓绗鍒鐢鎴缁缂缃鎬鐜钀閫鏈鏄鍑鍚鎾鏆鍥鍝鍞鍡鍢鍣鍤',
  ...'锟斤拷',
]);

/** Strings that must survive intact — catches damage the heuristic might miss. */
const MUST_CONTAIN = [
  ['src/utils/annotationMeta.ts', '错别字'],
  ['src/utils/annotationMeta.ts', '病句'],
  ['src/utils/annotationMeta.ts', '好句'],
  ['shared/prompts.mjs', '批注'],
  ['src/components/AnnotatedEssay.tsx', '波浪线'],
  ['src/components/ResultScreen.tsx', '总评'],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (EXTS.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(ROOT).filter(
  // This scanner legitimately contains the mojibake characters as its blocklist.
  (f) => path.basename(f) !== 'test-encoding.mjs'
);
const suspects = [];

/** Files that are allowed to carry a BOM (none currently, kept for clarity). */
const BOM_ALLOWED = new Set();

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');

  const found = [...new Set([...text].filter((c) => MOJIBAKE_TELLS.has(c)))];
  if (found.length) suspects.push([rel, found.join(' ')]);

  // A BOM in source files is a smell that a shell rewrote the file.
  const buf = fs.readFileSync(file);
  if (!BOM_ALLOWED.has(rel) && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    suspects.push([rel, 'UTF-8 BOM (likely rewritten by a shell)']);
  }
}

const missing = [];
for (const [rel, needle] of MUST_CONTAIN) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  if (!fs.readFileSync(full, 'utf8').includes(needle)) missing.push(`${rel} is missing "${needle}"`);
}

console.log(`scanned ${files.length} files`);

if (suspects.length) {
  console.log('\nSUSPECT (mojibake or BOM):');
  for (const [f, why] of suspects) console.log(`  ${f}  -> ${why}`);
}
if (missing.length) {
  console.log('\nMISSING EXPECTED TEXT:');
  for (const m of missing) console.log(`  ${m}`);
}

const failed = suspects.length + missing.length;
console.log(failed ? `\n${failed} problem(s) found` : '\nOK: no mojibake, no BOM, all expected text intact');
process.exit(failed ? 1 : 0);
