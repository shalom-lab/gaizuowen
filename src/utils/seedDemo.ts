import demoResult from '../data/demoEssay.json';
import { EssayGradingResult } from '../types';
import {
  StoredEssayRecord,
  getAllGradedEssaysFromIndexedDB,
  saveGradedEssayToIndexedDB,
} from './indexedDb';

/** Stable id so we can label it「示例」in the history list. */
export const DEMO_ESSAY_ID = 'essay-demo-sample';

const SEEDED_KEY = 'deepseek-zuowen-demo-seeded';

export function isDemoEssayId(id: string): boolean {
  return id === DEMO_ESSAY_ID;
}

function buildDemoRecord(): StoredEssayRecord {
  const r = demoResult as EssayGradingResult;
  return {
    id: DEMO_ESSAY_ID,
    title: r.title || '一次难忘的拔河比赛',
    studentName: r.studentName || '林小羽',
    gradeLevel: r.gradeLevel || '六年级',
    overallScore: r.overallScore,
    letterGrade: r.letterGrade,
    pageCount: r.pageCount || 1,
    // No photos in the sample — list shows「无图」, result still has full annotations.
    imageUrls: [],
    gradingResult: r,
    createdAt: Date.now() - 60_000,
  };
}

/**
 * First-visit seed: if history is empty, insert one sample graded essay so the
 * teacher can open「批改记录」and see what a finished result looks like.
 * Runs at most once per browser (localStorage flag); deleting the sample won't
 * bring it back.
 */
export async function ensureDemoEssay(): Promise<void> {
  try {
    if (localStorage.getItem(SEEDED_KEY) === '1') return;
  } catch {
    /* private mode — still try once based on empty history */
  }

  try {
    const existing = await getAllGradedEssaysFromIndexedDB();
    if (existing.length === 0) {
      await saveGradedEssayToIndexedDB(buildDemoRecord());
    }
  } catch (err) {
    console.warn('demo seed failed:', err);
  }

  try {
    localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    /* ignore */
  }
}
