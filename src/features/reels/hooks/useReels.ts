import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedStore } from '@/features/feed/store/feedStore';
import {
  getCachedReelsFeed,
  prefetchReelsFeed,
  setCachedReelsFeed,
} from '@/features/reels/services/reelsFeedCache';
import { fetchReels } from '@/features/reels/services/reelsData';
import type { ReelItem } from '@/features/reels/types';

export function useReels() {
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const userId = user?.id ?? null;

  const initialCache = getCachedReelsFeed(regionId, userId);
  const [items, setItems] = useState<ReelItem[]>(initialCache?.items ?? []);
  const [loading, setLoading] = useState(!initialCache);
  const [cursor, setCursor] = useState<string | null>(initialCache?.cursor ?? null);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? true);
  const [activeIndex, setActiveIndex] = useState(0);
  const latestFetch = useRef(0);

  const applyFeed = useCallback(
    (nextItems: ReelItem[], nextCursor: string | null) => {
      setItems(nextItems);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
      setCachedReelsFeed(regionId, userId, {
        items: nextItems,
        cursor: nextCursor,
        hasMore: !!nextCursor,
      });
    },
    [regionId, userId],
  );

  const load = useCallback(async () => {
    const fetchId = ++latestFetch.current;
    setLoading(true);
    try {
      const result = await fetchReels(regionId, userId, null);
      if (fetchId !== latestFetch.current) return;
      applyFeed(result.items, result.nextCursor);
    } finally {
      if (fetchId === latestFetch.current) setLoading(false);
    }
  }, [applyFeed, regionId, userId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;
    const result = await fetchReels(regionId, userId, cursor);
    setItems((prev) => {
      const ids = new Set(prev.map((i) => i.id));
      const next = [...prev, ...result.items.filter((i) => !ids.has(i.id))];
      setCachedReelsFeed(regionId, userId, {
        items: next,
        cursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      });
      return next;
    });
    setCursor(result.nextCursor);
    setHasMore(!!result.nextCursor);
  }, [hasMore, cursor, regionId, userId]);

  const updateItem = useCallback((id: string, patch: Partial<ReelItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const prependReel = useCallback((reel: ReelItem) => {
    setItems((prev) => {
      if (prev.some((item) => item.id === reel.id)) return prev;
      return [reel, ...prev];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cached = getCachedReelsFeed(regionId, userId);
    if (cached) {
      setItems(cached.items);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void prefetchReelsFeed(regionId, userId).then(async (entry) => {
      if (cancelled) return;
      if (entry) {
        applyFeed(entry.items, entry.cursor);
        setLoading(false);
        return;
      }

      const fetchId = ++latestFetch.current;
      try {
        const result = await fetchReels(regionId, userId, null);
        if (cancelled || fetchId !== latestFetch.current) return;
        applyFeed(result.items, result.nextCursor);
      } finally {
        if (!cancelled && fetchId === latestFetch.current) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyFeed, regionId, userId]);

  return {
    items,
    loading,
    activeIndex,
    setActiveIndex,
    loadMore,
    updateItem,
    removeItem,
    prependReel,
    refresh: load,
  };
}
