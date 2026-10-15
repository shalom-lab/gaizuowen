import { EssayGradingResult, GradingJob } from '../types';
import { normalizeOnLoad } from '../../shared/queue.mjs';

export interface StoredEssayRecord {
  id: string;
  title: string;
  studentName: string;
  gradeLevel: string;
  overallScore: number;
  letterGrade: string;
  pageCount: number;
  imageUrls: string[];
  gradingResult: EssayGradingResult;
  createdAt: number; // timestamp
}

const DB_NAME = 'TeacherEssayGraderDB';
const DB_VERSION = 1;
const STORE_NAME = 'essays';
const DRAFT_STORE_NAME = 'current_draft';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('studentName', 'studentName', { unique: false });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update a graded essay record in IndexedDB
 */
export async function saveGradedEssayToIndexedDB(record: StoredEssayRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all graded essays sorted by createdAt descending
 */
export async function getAllGradedEssaysFromIndexedDB(): Promise<StoredEssayRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as StoredEssayRecord[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a graded essay by ID
 */
export async function deleteGradedEssayFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all essays in IndexedDB
 */
export async function clearAllEssaysFromIndexedDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Background grading queue
//
// Kept in the existing draft store under its own key, so no schema migration is
// needed. Jobs still marked `running` when the page unloads are restored as
// `pending` and re-run — the model call is idempotent, so the only cost is
// tokens, which beats silently losing a queued essay.
// ---------------------------------------------------------------------------

const JOB_QUEUE_KEY = 'job_queue';

export async function saveJobQueueToIndexedDB(jobs: GradingJob[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE_NAME);
    // Strip transient step text; it is only meaningful while running.
    const slim = jobs.filter((j) => j.status !== 'running').map((j) => ({ ...j, step: '' }));
    const req = store.put({ key: JOB_QUEUE_KEY, jobs: slim, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadJobQueueFromIndexedDB(): Promise<GradingJob[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readonly');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const req = store.get(JOB_QUEUE_KEY);
      req.onsuccess = () => {
        const jobs = (req.result?.jobs || []) as GradingJob[];
        resolve(normalizeOnLoad(jobs) as GradingJob[]);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
