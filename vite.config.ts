import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/**
 * GitHub Pages has no server rewrite, so an unknown path must still return the
 * app shell. Emitting 404.html covers deep links and refreshes.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(projectRoot, 'dist');
      const index = path.join(outDir, 'index.html');
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(outDir, '404.html'));
      }
    },
  };
}

/**
 * Local-dev convenience: exposes the .env key to the app so you don't have to
 * paste it while testing.
 *
 * Deliberately a virtual module rather than `define`, because Vite only applies
 * `define` during `build` — in `serve` the placeholder reaches the browser
 * unreplaced. The value is hard-coded to empty unless mode is `development`, so
 * a published `dist/` can never contain the key.
 */
function devSecrets(opts: { isDev: boolean; key: string; base: string }): Plugin {
  const VIRTUAL = 'virtual:dev-secrets';
  const RESOLVED = '\0' + VIRTUAL;
  const key = opts.isDev ? opts.key : '';
  const base = opts.isDev ? opts.base : '';

  return {
    name: 'dev-secrets',
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
      return null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      return [
        `export const DEV_KEY = ${JSON.stringify(key)};`,
        `export const DEV_BASE = ${JSON.stringify(base)};`,
      ].join('\n');
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  // Load every var (prefix '') so DEEPSEEK_API_KEY is visible.
  const env = loadEnv(mode, projectRoot, '');

  return {
    // Relative base works for both a user site and any project subpath,
    // so the same build deploys to owner.github.io/<repo>/ without edits.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      spaFallback(),
      devSecrets({
        isDev,
        key: env.DEEPSEEK_API_KEY || '',
        base: env.DEEPSEEK_BASE_URL || '',
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: '作文批改助手',
          short_name: '作文批改',
          description: '拍照上传小学生作文，自动给出可抄写作文本的批注与总评',
          lang: 'zh-CN',
          theme_color: '#e11d48',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: './',
          scope: './',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Cache the app shell so "Add to Home Screen" still opens offline.
          // Grading itself needs network + the teacher's DeepSeek key.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      host: true, // reachable from a phone on the same Wi-Fi
      port: 5173,
      hmr: true,
    },
  };
});
