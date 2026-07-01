import { useCallback, useEffect } from 'react';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { getStorySeenMap, sortStoryRings } from '@/features/stories/services/storySeenCache';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import type { StoryRing } from '@/features/stories/types';

export function useStoryRings(options: {
  enabled: boolean;
  viewerId: string | null;
}) {
  const { enabled, viewerId } = options;
  const rings = useStoryRingStore((s) => s.rings);
  const loading = useStoryRingStore((s) => s.loading);
  const nextCursor = useStoryRingStore((s) => s.nextCursor);
  const setRings = useStoryRingStore((s) => s.setRings);
  const setLoading = useStoryRingStore((s) => s.setLoading);
  const setNextCursor = useStoryRingStore((s) => s.setNextCursor);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const result = await fetchStoryRings({ viewerId });
      setRings(result.rings);
      setNextCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [enabled, setLoading, setNextCursor, setRings, viewerId]);

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
      setRings(merged);
      setNextCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, nextCursor, rings, setLoading, setNextCursor, setRings, viewerId]);

  useEffect(() => {
    if (!enabled) {
      setRings([]);
      setNextCursor(null);
      return;
    }
    void refresh();
  }, [enabled, refresh, setNextCursor, setRings]);

  const reorderLocally = useCallback(async (next: StoryRing[]) => {
    const seenAt = await getStorySeenMap();
    setRings(sortStoryRings(next, seenAt, viewerId));
  }, [setRings, viewerId]);

  return { rings, loading, refresh, loadMore, reorderLocally };
}
