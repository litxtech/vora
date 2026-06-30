import { REELS_HOT_AHEAD, REELS_HOT_BEHIND, REELS_PREFETCH_AHEAD } from '@/features/reels/constants';

export function getReelHotWindow(activeIndex: number, itemCount: number): { min: number; max: number } {
  if (itemCount <= 0) return { min: 0, max: -1 };
  const min = Math.max(0, activeIndex - REELS_HOT_BEHIND);
  const max = Math.min(itemCount - 1, activeIndex + REELS_HOT_AHEAD);
  return { min, max };
}

export function getReelPrefetchWindow(activeIndex: number, itemCount: number): { min: number; max: number } {
  if (itemCount <= 0) return { min: 0, max: -1 };
  const min = Math.max(0, activeIndex - REELS_HOT_BEHIND);
  const max = Math.min(itemCount - 1, activeIndex + REELS_PREFETCH_AHEAD);
  return { min, max };
}

export function isInReelHotWindow(index: number, activeIndex: number, itemCount: number): boolean {
  const { min, max } = getReelHotWindow(activeIndex, itemCount);
  return index >= min && index <= max;
}
