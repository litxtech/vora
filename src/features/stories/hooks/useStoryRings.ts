import { useCallback, useEffect } from 'react';
import { prefetchStoryRings, hasFreshStoryRingCache } from '@/features/stories/services/storyRingSession';
import { getStorySeenMap, sortStoryRings } from '@/features/stories/services/storySeenCache';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import type { StoryRing } from '@/features/stories/types';

export function useStoryRings(options: {
  enabled: boolean;
  viewerId: string | null;
  useCache?: boolean;
}) {
  const { enabled, viewerId, useCache = true } = options;
  const rings = useStoryRingStore((s) => s.rings);
  const loading = useStoryRingStore((s) => s.loading);
  const nextCursor = useStoryRingStore((s) => s.nextCursor);
  const setRings = useStoryRingStore((s) => s.setRings);
  const setLoading = useStoryRingStore((s) => s.setLoading);
  const setNextCursor = useStoryRingStore((s) => s.setNextCursor);
  const setViewerId = useStoryRingStore((s) => s.setViewerId);
  const applyRingsUpdate = useStoryRingStore((s) => s.applyRingsUpdate);

  const refresh = useCallback(
    async (options?: { animate?: boolean }) => {
      if (!enabled) return;
      const hasRings = useStoryRingStore.getState().rings.length > 0;
      await prefetchStoryRings(viewerId, {
        background: hasRings,
        animate: options?.animate ?? hasRings,
        useCache,
      });
    },
    [enabled, useCache, viewerId],
  );

  const loadMore = useCallback(async () => {
    if (!enabled || !nextCursor || loading) return;
    setLoading(true);
    try {
      const result = await fetchStoryRings({
        viewerId,
        cursor: nextCursor,
      });
      const seenAt = await getStorySeenMap();
      const merged = sortStoryRings([...rings, ...result.rings], seenAt, viewerId);
      applyRingsUpdate(merged, result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, nextCursor, rings, setLoading, applyRingsUpdate, viewerId]);

  useEffect(() => {
    if (!enabled) return;
    const hasRings = useStoryRingStore.getState().rings.length > 0;
    if (hasRings && useCache && hasFreshStoryRingCache(viewerId)) return;
    void refresh();
  }, [enabled, refresh, useCache, viewerId]);

  const reorderLocally = useCallback(
    async (next: StoryRing[]) => {
      const seenAt = await getStorySeenMap();
      setRings(sortStoryRings(next, seenAt, viewerId));
      setViewerId(viewerId ?? 'anon');
    },
    [setRings, setViewerId, viewerId],
  );

  return { rings, loading, refresh, loadMore, reorderLocally };
}
