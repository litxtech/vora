import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_DELAY_MS = 280;

type UseDoubleTapOptions = {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  delayMs?: number;
};

export function useDoubleTap({
  onSingleTap,
  onDoubleTap,
  delayMs = DEFAULT_DELAY_MS,
}: UseDoubleTapOptions) {
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSingleTapRef = useRef(onSingleTap);
  const onDoubleTapRef = useRef(onDoubleTap);

  onSingleTapRef.current = onSingleTap;
  onDoubleTapRef.current = onDoubleTap;

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < delayMs) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      onDoubleTapRef.current?.();
      return;
    }

    lastTapRef.current = now;
    if (!onSingleTapRef.current) return;

    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      onSingleTapRef.current?.();
    }, delayMs);
  }, [delayMs]);
}
