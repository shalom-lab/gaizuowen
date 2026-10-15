// Guards the top-right badge rule.
//
// The bug this prevents: the badge used to switch green/red in the same spot,
// so its meaning depended on state and could not be read at a glance. A badge
// must mean exactly one thing.
import { strict as assert } from 'assert';
import { historyBadge } from '../src/utils/historyBadge.ts';

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

check('no badge when there is nothing waiting', () => {
  assert.equal(historyBadge(0).show, false);
});

check('badge appears when a result is waiting to be opened', () => {
  const b = historyBadge(1);
  assert.equal(b.show, true);
  assert.equal(b.label, '1');
});

check('badge counts only unread results, not the whole archive', () => {
  // 30 saved essays, 2 unread -> the badge must say 2, not 30.
  assert.equal(historyBadge(2).label, '2');
});

check('label stays narrow on a phone', () => {
  assert.equal(historyBadge(9).label, '9');
  assert.equal(historyBadge(10).label, '9+');
  assert.equal(historyBadge(250).label, '9+');
});

check('tone never changes meaning', () => {
  // Always the "needs attention" tone, at every count.
  for (const n of [0, 1, 5, 99]) {
    assert.equal(historyBadge(n).tone, 'attention', `tone drifted at ${n}`);
  }
});

check('garbage input never renders a broken badge', () => {
  for (const bad of [NaN, -3, undefined, null]) {
    const b = historyBadge(bad);
    assert.equal(b.show, false, `should hide for ${String(bad)}`);
    assert.equal(b.label, '');
  }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
