import { EssayGradingResult } from '../types';

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

/**
 * Save current active working session so page refresh preserves state
 */
export async function saveActiveDraftToIndexedDB(data: {
  currentImages: string[];
  gradingResult: EssayGradingResult | null;
}): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE_NAME);
    const req = store.put({ key: 'active_session', ...data, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load current active working session from IndexedDB
 */
export async function loadActiveDraftFromIndexedDB(): Promise<{
  currentImages: string[];
  gradingResult: EssayGradingResult | null;
} | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readonly');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const req = store.get('active_session');
      req.onsuccess = () => {
        if (req.result) {
          resolve({
            currentImages: req.result.currentImages || [],
            gradingResult: req.result.gradingResult || null,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
