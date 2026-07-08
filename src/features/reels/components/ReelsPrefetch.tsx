import { useEffect } from 'react';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { prefetchReelsFeed } from '@/features/reels/services/reelsFeedCache';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { deferAfterInteractions } from '@/lib/ui/deferUntilUiIdle';

/**
 * Reels metadata önbelleği — Android'de video warmup yalnızca sekme odaklanınca.
 */
export function ReelsPrefetch() {
  const showReelsTab = useFeatureVisible('reels');
  const regionId = useFeedStore((s) => s.regionId);
  const { user } = useAuth();

  useEffect(() => {
    if (!showReelsTab || isAndroid()) return;

    const task = deferAfterInteractions(() => {
      void prefetchReelsFeed(regionId, user?.id ?? null);
    });
    return () => task.cancel();
  }, [showReelsTab, regionId, user?.id]);

  return null;
}
