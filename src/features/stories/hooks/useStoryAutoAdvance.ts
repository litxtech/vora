import { useCallback, useEffect, useRef } from 'react';
import { STORY_PHOTO_DURATION_MS } from '@/features/stories/constants';
import type { StoryItem } from '@/features/stories/types';

type UseStoryAutoAdvanceOptions = {
  item: StoryItem | null;
  isActive: boolean;
  isPaused: boolean;
  onComplete: () => void;
  onProgress: (progress: number) => void;
  videoPositionSec?: number;
  videoDurationSec?: number | null;
};

export function useStoryAutoAdvance({
  item,
  isActive,
  isPaused,
  onComplete,
  onProgress,
  videoPositionSec = 0,
  videoDurationSec,
}: UseStoryAutoAdvanceOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
  }, []);

  useEffect(() => {
    completedRef.current = false;
    clearTimer();

    if (!item || !isActive || isPaused) return;

    if (item.mediaType === 'video') {
      const durationMs = Math.max(1000, (videoDurationSec ?? item.durationSec ?? 15) * 1000);
      const tick = () => {
        const progress = Math.min(1, videoPositionSec / (durationMs / 1000));
        onProgress(progress);
        if (progress >= 0.995 && !completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      };
      tick();
      return;
    }

    const durationMs = STORY_PHOTO_DURATION_MS;
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const progress = Math.min(1, elapsed / durationMs);
      onProgress(progress);
      if (progress >= 1 && !completedRef.current) {
        completedRef.current = true;
        clearTimer();
        onComplete();
      }
    }, 50);

    return clearTimer;
  }, [
    clearTimer,
    isActive,
    isPaused,
    item,
    onComplete,
    onProgress,
    videoDurationSec,
    videoPositionSec,
  ]);

  return { clearTimer };
}
