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

export interface GradingSubmission {
  images: UploadedImagePage[];
  gradeLevel: string;
  studentName: string;
  promptHint: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

/**
 * One essay in the background grading queue.
 *
 * Grading is deliberately decoupled from what is on screen: the teacher submits
 * an essay and immediately goes back to capturing the next one, while jobs run
 * silently in the background. A finished job never steals focus from a result
 * the teacher is already reading — it just raises a quiet notification.
 */
export interface GradingJob {
  id: string;
  status: JobStatus;
  /** Human-readable progress line, shown only in the queue detail. */
  step: string;
  submission: GradingSubmission;
  result?: EssayGradingResult;
  error?: string;
  createdAt: number;
  finishedAt?: number;
  /** True once the teacher has opened this result. */
  read: boolean;
}
