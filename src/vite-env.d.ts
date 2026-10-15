/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Injected by the `dev-secrets` plugin in vite.config.ts.
 * Both are empty strings unless Vite is running in development mode.
 */
declare module 'virtual:dev-secrets' {
  export const DEV_KEY: string;
  export const DEV_BASE: string;
}
