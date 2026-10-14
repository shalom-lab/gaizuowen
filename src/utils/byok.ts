/**
 * BYOK secret handling.
 *
 * Keys live ONLY in localStorage, under flat names. Nothing is ever bundled,
 * committed, or sent anywhere except api.deepseek.com.
 *
 *   deepseek-zuowen-key    the teacher's DeepSeek API key
 *   deepseek-zuowen-base   optional API base URL override
 *   gh-zuowen-repo         optional "owner/repo" for publishing
 *   gh-zuowen-token        optional GitHub PAT for publishing
 *
 * For local development the .env key may be injected at build time by Vite
 * (`__DEV_DEEPSEEK_KEY__`); that injection is empty in production builds.
 */

import { DEV_KEY, DEV_BASE } from 'virtual:dev-secrets';

const APP = 'zuowen';

export const KEY_STORAGE = `deepseek-${APP}-key`;
export const BASE_STORAGE = `deepseek-${APP}-base`;
export const GH_REPO_STORAGE = `gh-${APP}-repo`;
export const GH_TOKEN_STORAGE = `gh-${APP}-token`;

export const DEFAULT_BASE_URL = 'https://api.deepseek.com';

// DEV_KEY / DEV_BASE come from the `virtual:dev-secrets` module, which is
// empty unless Vite is in development mode (see vite.config.ts).

function safeGet(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeSet(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode / storage disabled */
  }
}

export interface Secrets {
  apiKey: string;
  baseUrl: string;
  /** True when the key came from the dev-injected .env rather than user input. */
  fromEnv: boolean;
  ghRepo: string;
  ghToken: string;
}

/** Read all secrets. Called once at bootstrap so the app is usable immediately. */
export function loadSecrets(): Secrets {
  const stored = safeGet(KEY_STORAGE).trim();
  const apiKey = stored || DEV_KEY.trim();
  return {
    apiKey,
    baseUrl: safeGet(BASE_STORAGE).trim() || DEV_BASE.trim() || DEFAULT_BASE_URL,
    fromEnv: !stored && Boolean(DEV_KEY.trim()),
    ghRepo: safeGet(GH_REPO_STORAGE).trim(),
    ghToken: safeGet(GH_TOKEN_STORAGE).trim(),
  };
}

export function saveApiKey(key: string) {
  safeSet(KEY_STORAGE, key.trim());
}

export function saveBaseUrl(base: string) {
  const v = base.trim();
  safeSet(BASE_STORAGE, v === DEFAULT_BASE_URL ? '' : v);
}

export function saveGhRepo(repo: string) {
  safeSet(GH_REPO_STORAGE, repo.trim());
}

export function saveGhToken(token: string) {
  safeSet(GH_TOKEN_STORAGE, token.trim());
}

export function clearApiKey() {
  safeSet(KEY_STORAGE, '');
}

export function clearAllSecrets() {
  [KEY_STORAGE, BASE_STORAGE, GH_REPO_STORAGE, GH_TOKEN_STORAGE].forEach((k) => safeSet(k, ''));
}

/** Show only the tail of a key, enough to recognise which one is stored. */
export function maskKey(key: string): string {
  const k = (key || '').trim();
  if (!k) return '';
  if (k.length <= 8) return '••••';
  return `${k.slice(0, 3)}••••${k.slice(-4)}`;
}
