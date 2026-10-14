// Unit tests for the annotated-essay segmentation.
// Guarantees the page NEVER alters the pupil's original text, and that every
// bracket lands immediately after its exact marked span.
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';

// Mirror of the segmentation in src/components/AnnotatedEssay.tsx
function buildSegments(paragraphs, annotations) {
  const map = new Map();
  for (const a of annotations) {
    if (typeof a.paragraphIndex !== 'number') continue;
    if (typeof a.charStart !== 'number' || typeof a.charEnd !== 'number') continue;
    const list = map.get(a.paragraphIndex) || [];
    list.push({ start: a.charStart, end: a.charEnd, ann: a });
    map.set(a.paragraphIndex, list);
  }
  for (const [key, list] of map) {
    list.sort((x, y) => x.start - y.start);
    const clean = [];
    let cursor = -1;
    for (const s of list) {
      if (s.start >= cursor) { clean.push(s); cursor = s.end; }
    }
    map.set(key, clean);
  }
  return map;
}

/** Reading text with brackets stripped: must equal the original exactly. */
function readingText(paragraphs, annotations) {
  const map = buildSegments(paragraphs, annotations);
  return paragraphs
    .map((p) => {
      const segs = map.get(p.paragraphIndex) || [];
      let out = '';
      let cursor = 0;
      for (const s of segs) {
        out += p.text.slice(cursor, s.start);
        out += p.text.slice(s.start, s.end);
        cursor = s.end;
      }
      return out + p.text.slice(cursor);
    })
    .join('\n');
}

const paragraphs = [
  { paragraphIndex: 0, text: '一条又粗又粗的麻绳安静地躺在地上。' },
  { paragraphIndex: 1, text: '我班和五班、四班全部拿下，马上开始和二班较量。' },
];

/** Derive offsets from the text so the fixture can never drift out of sync. */
const ann = (id, type, pIdx, originalText, suggestedText, explanation, order) => {
  const charStart = paragraphs[pIdx].text.indexOf(originalText);
  assert.notEqual(charStart, -1, 'fixture error: "' + originalText + '" not in paragraph ' + pIdx);
  return {
    id, type, originalText, suggestedText, explanation, paragraphIndex: pIdx,
    charStart, charEnd: charStart + originalText.length, order,
  };
};

const annotations = [
  ann('a1', 'grammar', 0, '又粗又粗', '又粗又长', '重复啰嗦，改后更顺口', 1),
  ann('a2', 'typo', 1, '较量', undefined, '用词准确', 2),
  ann('a3', 'highlight', 0, '安静地躺在地上', undefined, '拟人，把麻绳写活了', 3),
];

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

check('original text is never altered', () => {
  const original = paragraphs.map((p) => p.text).join('\n');
  assert.equal(readingText(paragraphs, annotations), original);
});

check('segments are ordered and non-overlapping', () => {
  const p0 = buildSegments(paragraphs, annotations).get(0);
  assert.equal(p0.length, 2, 'expected 2 segments, got ' + p0.length);
  for (let i = 1; i < p0.length; i++) {
    assert.ok(p0[i].start >= p0[i - 1].end, 'segments overlap');
  }
});

check('overlapping annotations collapse to one', () => {
  const overlapping = [
    { id: 'x', type: 'typo', originalText: '又粗又粗', paragraphIndex: 0, charStart: 2, charEnd: 6 },
    { id: 'y', type: 'typo', originalText: '又粗', paragraphIndex: 0, charStart: 4, charEnd: 6 },
  ];
  const segs = buildSegments(paragraphs, overlapping).get(0);
  assert.equal(segs.length, 1, 'expected 1 after trim, got ' + segs.length);
  assert.equal(segs[0].ann.id, 'x');
});

check('each bracket sits right after its exact span', () => {
  const map = buildSegments(paragraphs, annotations);
  for (const a of annotations) {
    const seg = (map.get(a.paragraphIndex) || []).find((s) => s.ann.id === a.id);
    assert.ok(seg, 'segment for ' + a.id + ' missing');
    assert.equal(paragraphs[a.paragraphIndex].text.slice(seg.start, seg.end), a.originalText);
  }
});

check('annotations without offsets are ignored safely', () => {
  const segs = buildSegments(paragraphs, [{ id: 'z', type: 'typo', originalText: '麻绳' }]);
  assert.equal(segs.size, 0);
});

check('every annotation in the real fixture is placeable', () => {
  const fixturePath = path.join(process.cwd(), 'scripts', 'fixture-result.json');
  if (!fs.existsSync(fixturePath)) {
    console.log('      (fixture missing - run npm run fixture)');
    return;
  }
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const map = buildSegments(fixture.paragraphs, fixture.annotations);
  let placed = 0;
  for (const a of fixture.annotations) {
    if ((map.get(a.paragraphIndex) || []).some((s) => s.ann.id === a.id)) placed++;
  }
  assert.ok(fixture.annotations.length > 0, 'fixture has no annotations');
  assert.equal(placed, fixture.annotations.length, placed + '/' + fixture.annotations.length + ' placed');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
