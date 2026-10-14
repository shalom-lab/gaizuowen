export type AnnotationType = 'typo' | 'grammar' | 'punctuation' | 'highlight';

export interface UploadedImagePage {
  id: string;
  dataUrl: string;
  name: string;
}

export interface AnnotationItem {
  id: string;
  type: AnnotationType;
  /** Short label, e.g. "形近错字", "生动比喻". */
  category: string;
  /** The exact slice of the transcript this note attaches to. */
  originalText: string;
  /** The correction. Absent for highlights. */
  suggestedText?: string;
  /** Short teacher note (10-30 chars) meant to be copied by hand. */
  explanation: string;
  paragraphIndex?: number;
  charStart?: number;
  charEnd?: number;
  pageIndex?: number;
  /** 1-based reading-order number. */
  order?: number;
}

export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface EssayParagraph {
  paragraphIndex: number;
  text: string;
  pageIndex?: number;
}

export interface EssayGradingResult {
  title: string;
  suggestedTitles?: string[];
  gradeLevel: string;
  studentName?: string;
  wordCount: number;
  pageCount?: number;
  overallScore: number;
  letterGrade: string;
  /** The one long-form field: strictly 80-100 characters. */
  summaryComment: string;
  dimensionScores: {
    theme: DimensionScore;
    language: DimensionScore;
    structure: DimensionScore;
    mechanics: DimensionScore;
    emotion: DimensionScore;
  };
  paragraphs: EssayParagraph[];
  annotations: AnnotationItem[];
  strengths: string[];
}

/** Counts per annotation type, for the filter chips. */
export interface AnnotationCounts {
  all: number;
  typo: number;
  grammar: number;
  punctuation: number;
  highlight: number;
}
