// Verifies extractJson salvages truncated model output, using the SAME
// implementation the browser ships (shared/deepseek.mjs).
import { strict as assert } from 'assert';
import { extractJson } from '../shared/deepseek.mjs';

const cases = [
  { name: 'clean object', input: '{"a":1}', truncated: false },
  { name: 'markdown fenced', input: '```json\n{"a":1}\n```', truncated: false },
  {
    name: 'truncated mid-string',
    input: '{"title":"拔河","paragraphs":[{"text":"金秋送暖"},{"text":"比赛开',
    truncated: true,
  },
  {
    name: 'truncated mid-array',
    input: '{"title":"拔河","annotations":[{"type":"typo","originalText":"对量"},{"type":"gram',
    truncated: true,
  },
  { name: 'braces inside a string', input: '{"t":"a{b}c","arr":[{"x":"},"},{"y":"ok"}]}', truncated: false },
  { name: 'empty object', input: '{}', truncated: false },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  try {
    const { data, truncated } = extractJson(c.input);
    assert.equal(truncated, c.truncated, 'truncated flag mismatch (got ' + truncated + ')');
    assert.equal(typeof data, 'object');
    console.log('PASS  ' + c.name + '  -> truncated=' + truncated + ' keys=' + Object.keys(data).join(','));
    pass++;
  } catch (e) {
    console.log('FAIL  ' + c.name + '  -> ' + e.message);
    fail++;
  }
}

// Non-JSON input must throw a clear error rather than return garbage.
try {
  extractJson('完全不是 JSON');
  console.log('FAIL  non-JSON input should throw');
  fail++;
} catch (e) {
  console.log('PASS  non-JSON input throws  -> ' + e.message);
  pass++;
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
