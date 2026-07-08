import { useEffect, useRef } from 'react';
import { STORY_PHOTO_DURATION_MS } from '@/features/stories/constants';
import { isStoryImageItem } from '@/features/stories/services/storyMediaUrl';
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
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  const completedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  const itemId = item?.id ?? null;
  const itemDurationSec = item?.durationSec ?? null;
  const itemMediaType = item?.mediaType ?? 'image';
  const itemMediaUrl = item?.mediaUrl ?? '';
  const isPhoto = item ? isStoryImageItem(itemMediaType, itemMediaUrl) : false;

  useEffect(() => {
    completedRef.current = false;
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = null;
    onProgressRef.current(0);
  }, [itemId]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!itemId || !isActive || !isPhoto) {
      startedAtRef.current = null;
      return;
    }

    if (isPaused) {
      if (startedAtRef.current != null) {
        elapsedBeforePauseRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
      return;
    }

    startedAtRef.current = Date.now();

    const tick = () => {
      const runningElapsed = startedAtRef.current != null ? Date.now() - startedAtRef.current : 0;
      const elapsed = elapsedBeforePauseRef.current + runningElapsed;
      const progress = Math.min(1, elapsed / STORY_PHOTO_DURATION_MS);
      onProgressRef.current(progress);

      if (progress >= 1 && !completedRef.current) {
        completedRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onCompleteRef.current();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isPaused, isPhoto, itemId]);

  useEffect(() => {
    if (!itemId || !isActive || isPaused || isPhoto) return;

    const durationSec = Math.max(0.1, videoDurationSec ?? itemDurationSec ?? 15);
    const progress = Math.min(1, videoPositionSec / durationSec);
    onProgressRef.current(progress);

    if (progress >= 0.98 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, [isActive, isPaused, isPhoto, itemId, itemDurationSec, videoDurationSec, videoPositionSec]);

  return {
    clearTimer: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    },
  };
}
