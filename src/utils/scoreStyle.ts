/**
 * Colour a result by how good it actually is.
 *
 * Previously every grade was rendered green, so a "待提升 (C)" looked as
 * reassuring as a "特优 (S)" — the colour carried no information and actively
 * misled. Colour now means exactly one thing: how well the pupil did.
 *
 * The number on screen is the primary datum, so the colour follows the number
 * whenever there is one. The letter grade is only a fallback for the case where
 * a score is missing — this keeps the big number and its colour consistent
 * instead of showing "95" in red.
 */
export interface ScoreStyle {
  /** Colour for the number / grade text. */
  text: string;
  /** Tinted background chip. */
  bg: string;
  border: string;
}

export type ScoreBand = 'top' | 'mid' | 'low';

const BANDS: Record<ScoreBand, ScoreStyle> = {
  // 特优 (S) / 优秀 (A)
  top: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  // 良好 (B)
  mid: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  // 待提升 (C)
  low: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export function scoreBand(score: number, letterGrade?: string): ScoreBand {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : NaN;
  if (Number.isFinite(s)) {
    if (s >= 90) return 'top';
    if (s >= 80) return 'mid';
    return 'low';
  }

  const g = letterGrade || '';
  if (/特优|优秀/.test(g)) return 'top';
  if (/待提升|待改进/.test(g)) return 'low';
  return 'mid';
}

export function scoreStyle(score: number, letterGrade?: string): ScoreStyle {
  return BANDS[scoreBand(score, letterGrade)];
}
