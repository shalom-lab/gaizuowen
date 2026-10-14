import { AnnotationType } from '../types';

/**
 * How each kind of annotation is drawn.
 *
 * Follows the teacher's red-pen convention, so what she sees on screen is
 * exactly what she draws on the paper:
 *   直线 = 要改的地方 (错别字 / 病句 / 标点)
 *   波浪线 = 好句子 (优美词句)
 */
export interface TypeMeta {
  label: string;
  /** Inline mark on the transcript. */
  textClass: string;
  /** Small pill next to the mark. */
  badgeClass: string;
  /** Colored number chip. */
  chipClass: string;
  /** Card accent in the notes list. */
  cardClass: string;
  /** Text color for the correction. */
  fixClass: string;
}

export const TYPE_META: Record<AnnotationType, TypeMeta> = {
  typo: {
    label: '错别字',
    textClass: 'bg-red-100 text-red-950 teacher-line-red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    chipClass: 'bg-red-600 text-white',
    cardClass: 'border-l-4 border-red-500 bg-red-50/40',
    fixClass: 'text-red-700 bg-red-50 border-red-200',
  },
  grammar: {
    label: '病句',
    textClass: 'bg-orange-100 text-orange-950 teacher-line-orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    chipClass: 'bg-orange-600 text-white',
    cardClass: 'border-l-4 border-orange-500 bg-orange-50/40',
    fixClass: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  punctuation: {
    label: '标点',
    textClass: 'bg-purple-100 text-purple-950 teacher-line-purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    chipClass: 'bg-purple-600 text-white',
    cardClass: 'border-l-4 border-purple-500 bg-purple-50/40',
    fixClass: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  highlight: {
    label: '好句',
    textClass: 'bg-amber-100 text-amber-950 teacher-wavy-gold',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    chipClass: 'bg-amber-500 text-white',
    cardClass: 'border-l-4 border-amber-500 bg-amber-50/40',
    fixClass: 'text-amber-800 bg-amber-50 border-amber-200',
  },
};
