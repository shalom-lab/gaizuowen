// Guards the colour semantics.
//
// The original bug: every grade rendered green, so "待提升 (C)" looked as
// reassuring as "特优 (S)". Colour must mean exactly one thing — how well the
// pupil did — and must never contradict the grade it sits next to.
import { strict as assert } from 'assert';
import { scoreStyle } from '../src/utils/scoreStyle.ts';

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log('PASS  ' + name);
    pass++;
  } catch (e) {
    console.log('FAIL  ' + name + '\n      ' + e.message);
    fail++;
  }
};

check('top grades are green', () => {
  assert.equal(scoreStyle(96, '特优 (S)').text, 'text-emerald-600');
  assert.equal(scoreStyle(91, '优秀 (A)').text, 'text-emerald-600');
});

check('良好 is amber, not green', () => {
  assert.equal(scoreStyle(85, '良好 (B)').text, 'text-amber-600');
});

check('low grades are red, never green', () => {
  const s = scoreStyle(62, '待提升 (C)');
  assert.equal(s.text, 'text-rose-600');
  assert.notEqual(s.text, 'text-emerald-600', 'a C must not look reassuring');
});

check('the displayed number wins, so it never shows "95" in red', () => {
  // If score and grade ever disagree, the big number is what she reads first,
  // so the colour must match it rather than contradict it.
  assert.equal(scoreStyle(95, '待提升 (C)').text, 'text-emerald-600');
  assert.equal(scoreStyle(62, '特优 (S)').text, 'text-rose-600');
});

check('the letter grade decides only when there is no number', () => {
  assert.equal(scoreStyle(NaN, '特优 (S)').text, 'text-emerald-600');
  assert.equal(scoreStyle(NaN, '待提升 (C)').text, 'text-rose-600');
  assert.equal(scoreStyle(NaN, '良好 (B)').text, 'text-amber-600');
});

check('score decides when there is no grade text', () => {
  assert.equal(scoreStyle(93).text, 'text-emerald-600');
  assert.equal(scoreStyle(85).text, 'text-amber-600');
  assert.equal(scoreStyle(70).text, 'text-rose-600');
});

check('boundaries land on the right side', () => {
  assert.equal(scoreStyle(90).text, 'text-emerald-600', '90 must be green');
  assert.equal(scoreStyle(89).text, 'text-amber-600', '89 is still 良好');
  assert.equal(scoreStyle(80).text, 'text-amber-600', '80 is 良好');
  assert.equal(scoreStyle(79).text, 'text-rose-600', '79 must be red');
});

check('never returns an undefined colour', () => {
  for (const s of [0, 50, 79, 80, 89, 90, 100]) {
    const st = scoreStyle(s, '');
    assert.ok(st.text && st.bg && st.border, `incomplete style for ${s}`);
  }
  const nan = scoreStyle(NaN, undefined);
  assert.ok(nan.text, 'must survive a non-numeric score');
  assert.equal(nan.text, 'text-amber-600', 'unknown score falls back to the middle band');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
