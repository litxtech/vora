import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { STORIES_FEATURE } from '@/features/stories/featureFlags';
import {
  hasFreshStoryRingCache,
  hydrateStoryRingCacheFromDisk,
  hydrateStoryRingsIntoStore,
  prefetchStoryRings,
  readMemoryStoryRingCache,
} from '@/features/stories/services/storyRingSession';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';

/**
 * Oturum açıldıktan sonra hikâye halkalarını arka planda hazırlar.
 * Önbellek varsa ağ isteği ertelenir; yoksa hızlı yol ile hemen başlar.
 */
export function StoryRingsBootstrap() {
  const storiesVisible = useFeatureVisible(STORIES_FEATURE.root);
  const bootstrapEnabled = useFeatureVisible(STORIES_FEATURE.ringBootstrap);
  const { user } = useAuth();
  const deferTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!storiesVisible || !bootstrapEnabled) return;

    const viewerId = user?.id ?? null;
    let cancelled = false;

    const prepare = async () => {
      if (!readMemoryStoryRingCache(viewerId)) {
        await hydrateStoryRingCacheFromDisk();
      }
      if (cancelled) return;
      hydrateStoryRingsIntoStore(viewerId);
    };

    void prepare();

    const hasCache = hasFreshStoryRingCache(viewerId);
    const delayMs = hasCache ? 1_200 : 120;

    const timer = setTimeout(() => {
      if (cancelled) return;
      deferTaskRef.current = deferBackgroundWork(() => {
        if (!cancelled) void prefetchStoryRings(viewerId, { background: hasCache });
      });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      deferTaskRef.current?.cancel();
      deferTaskRef.current = null;
    };
  }, [bootstrapEnabled, storiesVisible, user?.id]);

  return null;
}
