import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Horizontal finger/mouse swipe for page browsing.
 * Ignores mostly-vertical moves so it doesn't fight scrolling.
 */
export function useHorizontalSwipe(options: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  /** Min horizontal travel in px. */
  threshold?: number;
}) {
  const { onSwipeLeft, onSwipeRight, enabled = true, threshold = 40 } = options;
  const start = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY };
    },
    [enabled]
  );

  const finish = useCallback(
    (clientX: number, clientY: number) => {
      const s = start.current;
      start.current = null;
      if (!s || !enabled) return;
      const dx = clientX - s.x;
      const dy = clientY - s.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      finish(e.clientX, e.clientY);
    },
    [finish]
  );

  const onPointerCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
