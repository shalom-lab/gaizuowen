import { AnnotationType } from '../types';

export interface TypeMeta {
  label: string;
  /** Inline highlight on the transcript. */
  textClass: string;
  /** Small pill on the transcript. */
  badgeClass: string;
  /** Colored number chip in the list. */
  chipClass: string;
  /** Card accent in the list. */
  cardClass: string;
  /** Text color for the correction. */
  fixClass: string;
  dotClass: string;
}

export const TYPE_META: Record<AnnotationType, TypeMeta> = {
  typo: {
    label: '错别字',
    textClass: 'bg-red-100 text-red-950 teacher-wavy-red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    chipClass: 'bg-red-600 text-white',
    cardClass: 'border-l-4 border-red-500 bg-red-50/40',
    fixClass: 'text-red-700 bg-red-50 border-red-200',
    dotClass: 'bg-red-500',
  },
  grammar: {
    label: '病句',
    textClass: 'bg-orange-100 text-orange-950 teacher-wavy-orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    chipClass: 'bg-orange-600 text-white',
    cardClass: 'border-l-4 border-orange-500 bg-orange-50/40',
    fixClass: 'text-orange-700 bg-orange-50 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  punctuation: {
    label: '标点',
    textClass: 'bg-purple-100 text-purple-950',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    chipClass: 'bg-purple-600 text-white',
    cardClass: 'border-l-4 border-purple-500 bg-purple-50/40',
    fixClass: 'text-purple-700 bg-purple-50 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  highlight: {
    label: '好句',
    textClass: 'bg-amber-100 text-amber-950 teacher-wavy-gold',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    chipClass: 'bg-amber-500 text-white',
    cardClass: 'border-l-4 border-amber-500 bg-amber-50/40',
    fixClass: 'text-amber-800 bg-amber-50 border-amber-200',
    dotClass: 'bg-amber-500',
  },
};

export const TYPE_ORDER: AnnotationType[] = ['typo', 'grammar', 'punctuation', 'highlight'];

/** Chinese circled numerals for the first 20 items, then (21), (22)... */
export function circleNumber(n: number): string {
  const chars = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
  return chars[n - 1] || `(${n})`;
}
