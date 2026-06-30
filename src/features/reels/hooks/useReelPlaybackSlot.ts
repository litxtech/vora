import { isInReelHotWindow } from '@/features/reels/services/reelWindow';
import { useReelsPlaybackStore } from '@/features/reels/store/reelsPlaybackStore';

/**
 * Her reel yalnızca kendi slot durumu değişince render olur (tüm feed değil).
 */
export function useReelPlaybackSlot(index: number, isFocused: boolean) {
  const isActive = useReelsPlaybackStore((s) => isFocused && s.activeIndex === index);
  const inHotWindow = useReelsPlaybackStore((s) => {
    if (!isFocused || s.activeIndex < 0) return false;
    return isInReelHotWindow(index, s.activeIndex, s.itemCount);
  });
  const shouldPreload = useReelsPlaybackStore((s) => {
    if (!isFocused || s.activeIndex < 0) return false;
    return isInReelHotWindow(index, s.activeIndex, s.itemCount) && index !== s.activeIndex;
  });

  return { isActive, inHotWindow, shouldPreload };
}
