/**
 * The one rule for the badge on the history icon (top right).
 *
 * It used to switch between green and red in the same position, meaning two
 * different things depending on state — impossible to read at a glance. Now a
 * badge has exactly ONE meaning:
 *
 *   玫红角标 = 有 N 篇刚批好、你还没看过的结果
 *
 * So it appears only when there is something waiting for her, and disappears
 * once she has opened them. The total number of records lives in the sheet
 * header ("N 篇") instead of competing for the same pixels.
 *
 * Green is deliberately NOT used here: green means "操作成功" elsewhere
 * (copy succeeded, key saved, grading finished), and mixing that with
 * "you have something to do" is what made the old badge confusing.
 */
export interface HistoryBadge {
  show: boolean;
  label: string;
  /** Always the "needs your attention" tone — never switches meaning. */
  tone: 'attention';
}

export function historyBadge(unreadCount: number): HistoryBadge {
  const n = Number.isFinite(unreadCount) && unreadCount > 0 ? Math.floor(unreadCount) : 0;
  if (n === 0) return { show: false, label: '', tone: 'attention' };
  // Keep the pill narrow on a phone.
  return { show: true, label: n > 9 ? '9+' : String(n), tone: 'attention' };
}
