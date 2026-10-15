/**
 * Result normalization + annotation anchoring.
 *
 * The LLM is good at *finding* problems but unreliable at reporting exact character
 * offsets. Strategy: trust `originalText`, distrust `charStart`/`charEnd`, and
 * re-derive offsets against the transcript we actually rendered. This is what makes
 * the highlight in the UI line up with the comment in the margin sheet.
 */

const VALID_TYPES = new Set(['typo', 'grammar', 'punctuation', 'highlight']);

const TYPE_ALIASES = {
  typo: 'typo', 错别字: 'typo', 错字: 'typo', 别字: 'typo', 字形: 'typo', spelling: 'typo',
  grammar: 'grammar', 病句: 'grammar', 语病: 'grammar', 语法: 'grammar', 搭配不当: 'grammar',
  punctuation: 'punctuation', 标点: 'punctuation', 标点符号: 'punctuation', 标点误用: 'punctuation',
  highlight: 'highlight', 佳句: 'highlight', 优美词句: 'highlight', 好句: 'highlight', 赏析: 'highlight',
  // praise folds into highlight: the teacher marks both with a wavy line.
  praise: 'highlight', 亮点: 'highlight', 表扬: 'highlight', 构思: 'highlight',
};

const DEFAULT_DIMS = [
  { key: 'theme', name: '主题立意', maxScore: 20 },
  { key: 'language', name: '语言表达', maxScore: 25 },
  { key: 'structure', name: '篇章结构', maxScore: 20 },
  { key: 'mechanics', name: '错字标点', maxScore: 15 },
  { key: 'emotion', name: '情感真实', maxScore: 20 },
];

const INVALID_TITLES = ['', '无题', '作文', '未命名', '未命名作文', '习作', '小学作文', '学生作文', 'null', 'undefined'];

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function num(v, dflt = 0) {
  const n = typeof v === 'number' ? v : parseFloat(str(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : dflt;
}

function countHanzi(text) {
  return (str(text).match(/[\u4e00-\u9fa5]/g) || []).length;
}

/** Trim a single leading/trailing punctuation char set, used for fuzzy re-anchoring. */
const EDGE_PUNCT = /^[\s，。！？、；：“”‘’《》（）()【】…—\-·]+|[\s，。！？、；：“”‘’《》（）()【】…—\-·]+$/g;

/**
 * Map each annotation onto a paragraph + exact char range.
 * Tries, in order: exact slice as given -> indexOf in the claimed paragraph ->
 * indexOf anywhere -> punctuation-trimmed fuzzy match. Unanchorable items are dropped.
 */
function anchorAnnotations(paragraphs, annotations) {
  const out = [];
  const used = new Map(); // paragraphIndex -> occupied [start,end) ranges

  const overlaps = (pIdx, start, end) => {
    const ranges = used.get(pIdx) || [];
    return ranges.some(([s, e]) => start < e && end > s);
  };
  const claim = (pIdx, start, end) => {
    if (!used.has(pIdx)) used.set(pIdx, []);
    used.get(pIdx).push([start, end]);
  };

  annotations.forEach((raw, idx) => {
    const type = TYPE_ALIASES[str(raw.type).trim().toLowerCase()] || TYPE_ALIASES[str(raw.type).trim()] || 'highlight';
    const resolvedType = VALID_TYPES.has(type) ? type : 'highlight';

    let originalText = str(raw.originalText || raw.text || raw.original).trim();
    if (!originalText) return;

    const claimedP = Number.isFinite(raw.paragraphIndex) ? Number(raw.paragraphIndex) : 0;

    let found = null;

    // 1. Trust an exact char slice if it really matches.
    if (Number.isFinite(raw.charStart) && Number.isFinite(raw.charEnd)) {
      const p = paragraphs[claimedP];
      if (p && p.text.substring(raw.charStart, raw.charEnd) === originalText) {
        found = { pIdx: claimedP, start: raw.charStart, end: raw.charEnd };
      }
    }

    // 2. Search the claimed paragraph, then all paragraphs.
    if (!found) {
      const order = [claimedP, ...paragraphs.map((_, i) => i).filter((i) => i !== claimedP)];
      outer: for (const pIdx of order) {
        const p = paragraphs[pIdx];
        if (!p) continue;
        let from = 0;
        while (true) {
          const at = p.text.indexOf(originalText, from);
          if (at === -1) break;
          if (!overlaps(pIdx, at, at + originalText.length)) {
            found = { pIdx, start: at, end: at + originalText.length };
            break outer;
          }
          from = at + 1;
        }
      }
    }

    // 3. Fuzzy: strip edge punctuation, and for long spans retry a shorter prefix.
    if (!found) {
      const candidates = [originalText.replace(EDGE_PUNCT, '')];
      if (originalText.length > 8) {
        candidates.push(originalText.slice(0, 8).replace(EDGE_PUNCT, ''));
        candidates.push(originalText.slice(0, 4).replace(EDGE_PUNCT, ''));
      }
      for (const cand of candidates) {
        if (cand.length < 1) continue;
        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          const at = paragraphs[pIdx]?.text.indexOf(cand) ?? -1;
          if (at !== -1 && !overlaps(pIdx, at, at + cand.length)) {
            found = { pIdx, start: at, end: at + cand.length };
            originalText = cand;
            break;
          }
        }
        if (found) break;
      }
    }

    // 4. Give up on anchoring this one — drop it rather than render a broken highlight.
    if (!found) return;

    claim(found.pIdx, found.start, found.end);

    out.push({
      id: str(raw.id) || `ann-${idx}-${found.start}`,
      type: resolvedType,
      category: str(raw.category || raw.label || '').trim() || defaultCategory(resolvedType),
      originalText,
      suggestedText: str(raw.suggestedText || raw.suggestion || raw.correction).trim() || undefined,
      explanation: clipNote(raw.explanation || raw.comment || raw.reason || raw.note, 40),
      paragraphIndex: found.pIdx,
      charStart: found.start,
      charEnd: found.end,
      pageIndex: Number.isFinite(raw.pageIndex) ? Number(raw.pageIndex) : paragraphs[found.pIdx]?.pageIndex,
    });
  });

  // Reading order, so the margin sheet numbers match top-to-bottom flow.
  out.sort((a, b) => (a.paragraphIndex - b.paragraphIndex) || (a.charStart - b.charStart));
  return out.map((a, i) => ({ ...a, id: a.id || `ann-${i}`, order: i + 1 }));
}

function defaultCategory(type) {
  return {
    typo: '错别字',
    grammar: '病句修改',
    punctuation: '标点规范',
    highlight: '优美词句',
  }[type] || '批注';
}

/** Keep a teacher-facing note short enough to copy by hand into a margin. */
function clipNote(text, max = 40) {
  const t = str(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  for (let i = max; i >= max - 12 && i > 0; i--) {
    if ('。！？；，、'.includes(t[i - 1])) return t.slice(0, i);
  }
  return t.slice(0, max - 1) + '…';
}

/** Guarantee a real title instead of "无题"/"". */
function ensureTitle(parsed) {
  let title = str(parsed.title).trim().replace(/^《|》$/g, '');
  if (INVALID_TITLES.includes(title) || title.length < 2) {
    const full = (parsed.paragraphs || []).map((p) => str(p.text)).join('');
    if (/猫|狗|兔|鸟|小动物|宠物/.test(full)) title = '我的动物好朋友';
    else if (/树|花|草|春|秋|雨|风|阳光/.test(full)) title = '藏在四季里的小美好';
    else if (/妈|爸|奶奶|爷爷|老师|同学|朋友/.test(full)) title = '藏在心底的那份温暖';
    else if (/比赛|拔河|跑步|考试|运动会|赢了|输了/.test(full)) title = '那一刻，我懂得了团结';
    else if (/难忘|后悔|第一次|勇敢/.test(full)) title = '那一刻，我长大了';
    else title = '童年里的一束光';
    parsed.title = title;
  } else {
    parsed.title = title;
  }

  const suggested = Array.isArray(parsed.suggestedTitles)
    ? parsed.suggestedTitles.map((t) => str(t).replace(/^《|》$/g, '').trim()).filter(Boolean)
    : [];
  const fallbacks = ['阳光下的那一幕', '岁月里的小欢喜', '那一抹难忘的微笑'];
  for (const f of fallbacks) {
    if (suggested.length >= 3) break;
    if (!suggested.includes(f) && f !== parsed.title) suggested.push(f);
  }
  parsed.suggestedTitles = suggested.slice(0, 3);
}

/** Clamp summaryComment into the 80-100 character band the report layout assumes. */
function normalizeSummary(comment) {
  let text = str(comment).replace(/\s+/g, ' ').trim();
  if (!text) {
    return '本篇习作选材真实、情感真挚，字里行间能感受到你认真观察生活的眼睛，这是最可贵的写作品质。如果能把最打动你的那个瞬间放慢来写，加上动作与心里的想法，文章会更加生动感人。继续保持这份对生活的热爱，期待你下一篇更精彩的佳作！';
  }
  const len = text.length;
  if (len >= 80 && len <= 100) return text;

  if (len > 100) {
    for (let i = 100; i >= 80; i--) {
      if ('。！？；!?;，'.includes(text[i - 1])) return text.slice(0, i);
    }
    return text.slice(0, 87) + '，继续加油！';
  }

  const closings = [
    '继续保持这份认真与热爱，你的文字一定会越来越有光芒！',
    '老师期待你在下一篇习作中带来更多惊喜，加油！',
    '多读多写，把心里的感受写细致，你会越写越棒！',
  ];
  for (const c of closings) {
    const joined = /[。！？!?]$/.test(text) ? text + c : text + '。' + c;
    if (joined.length >= 80 && joined.length <= 100) return joined;
    if (joined.length > 100) return joined.slice(0, 87) + '，继续加油！';
  }
  return (text + '，老师期待你更大的进步！').slice(0, 100);
}

function normalizeLetterGrade(grade, score) {
  const g = str(grade);
  if (/特优|S\b/.test(g)) return '特优 (S)';
  if (/优秀|A\b/.test(g)) return '优秀 (A)';
  if (/良好|B\b/.test(g)) return '良好 (B)';
  if (/待提升|待改进|C\b/.test(g)) return '待提升 (C)';
  if (score >= 95) return '特优 (S)';
  if (score >= 90) return '优秀 (A)';
  if (score >= 80) return '良好 (B)';
  return '待提升 (C)';
}

/**
 * Coerce raw model JSON into the exact `EssayGradingResult` shape the UI reads.
 * @param {any} parsed
 * @param {{gradeLevel?: string, studentName?: string, pageCount?: number}} ctx
 */
export function normalizeResult(parsed, ctx = {}) {
  const { gradeLevel = '六年级', studentName = '同学', pageCount = 1 } = ctx;
  const out = {};

  // --- paragraphs ---
  let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
  paragraphs = paragraphs
    .map((p, i) => ({
      paragraphIndex: i,
      text: str(typeof p === 'string' ? p : p.text).trim(),
      pageIndex: Number.isFinite(p?.pageIndex) ? Number(p.pageIndex) : undefined,
    }))
    .filter((p) => p.text.length > 0);

  // Some models return paragraphs as one blob; split on blank lines as a rescue.
  if (paragraphs.length === 1 && paragraphs[0].text.includes('\n')) {
    const parts = paragraphs[0].text.split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean);
    if (parts.length > 1) {
      paragraphs = parts.map((text, i) => ({ paragraphIndex: i, text, pageIndex: undefined }));
    }
  }

  if (paragraphs.length === 0) {
    const single = str(parsed.text || parsed.content || parsed.fullText).trim();
    if (single) paragraphs = [{ paragraphIndex: 0, text: single, pageIndex: 0 }];
  }

  out.paragraphs = paragraphs;
  ensureTitle({ ...parsed, paragraphs });

  // --- annotations (anchored against the paragraphs we just built) ---
  const rawAnnotations = Array.isArray(parsed.annotations)
    ? parsed.annotations
    : Array.isArray(parsed.annotations?.items)
      ? parsed.annotations.items
      : [];
  out.annotations = anchorAnnotations(paragraphs, rawAnnotations);

  // --- scores ---
  const rawDims = parsed.dimensionScores || parsed.dimensions || {};
  const dims = {};
  for (const { key, name, maxScore } of DEFAULT_DIMS) {
    const d = rawDims[key] || rawDims[name] || {};
    let score = num(typeof d === 'number' ? d : d.score, NaN);
    if (!Number.isFinite(score)) {
      // Some responses nest by Chinese name only; fall back to a proportional guess.
      score = Math.round(maxScore * 0.8);
    }
    score = Math.max(0, Math.min(maxScore, Math.round(score)));
    dims[key] = {
      name,
      score,
      maxScore,
      comment: clipNote(d.comment || d.explanation || d.remark, 24) || '继续保持，稳步提升。',
    };
  }
  out.dimensionScores = dims;

  const dimSum = DEFAULT_DIMS.reduce((s, { key }) => s + dims[key].score, 0);
  let overall = num(parsed.overallScore, NaN);
  if (!Number.isFinite(overall)) overall = dimSum;
  overall = Math.max(0, Math.min(100, Math.round(overall)));
  out.overallScore = overall;
  out.letterGrade = normalizeLetterGrade(parsed.letterGrade, overall);

  out.title = str(parsed.title).trim().replace(/^《|》$/g, '') || '童年里的一束光';
  out.suggestedTitles = parsed.suggestedTitles;
  ensureTitle(out);

  out.gradeLevel = gradeLevel;
  out.studentName = studentName;
  out.pageCount = pageCount;
  out.wordCount = num(parsed.wordCount, 0) || countHanzi(paragraphs.map((p) => p.text).join(''));
  out.summaryComment = normalizeSummary(parsed.summaryComment || parsed.comment || parsed.overallComment);

  // --- lists ---
  out.strengths = (Array.isArray(parsed.strengths) ? parsed.strengths : [])
    .map((s) => clipNote(typeof s === 'string' ? s : s?.text || s?.content, 46))
    .filter(Boolean)
    .slice(0, 5);

  return out;
}
