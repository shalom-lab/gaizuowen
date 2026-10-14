import { useEffect, useRef } from 'react';

/**
 * Keep the screen awake while `active`.
 *
 * Why this matters here: the teacher reads a comment, then looks down and writes
 * it on paper. That takes longer than the screen timeout, so without this the
 * phone dims or locks exactly when she is mid-sentence — and she has to wake it
 * and find her place again.
 *
 * Silently does nothing where unsupported (iOS Safari) or when permission is
 * denied; the wake lock is released automatically when the tab is hidden, so we
 * re-acquire on return.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!active) return;

    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    if (!supported) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          sentinel?.release?.().catch?.(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        // The browser releases the lock on its own when hidden.
        sentinel.addEventListener?.('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        /* unsupported, denied, or low battery — fail quietly */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      try {
        s?.release?.();
      } catch {
        /* ignore */
      }
    };
  }, [active]);
}
