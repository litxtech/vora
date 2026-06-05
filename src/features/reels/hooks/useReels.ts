import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { fetchReels } from '@/features/reels/services/reelsData';
import type { ReelItem } from '@/features/reels/types';

export function useReels() {
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);

  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const latestFetch = useRef(0);

  const load = useCallback(async () => {
    const fetchId = ++latestFetch.current;
    setLoading(true);
    try {
      const result = await fetchReels(regionId, user?.id ?? null, null);
      if (fetchId !== latestFetch.current) return;
      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } finally {
      if (fetchId === latestFetch.current) setLoading(false);
    }
  }, [regionId, user?.id]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;
    const result = await fetchReels(regionId, user?.id ?? null, cursor);
    setItems((prev) => {
      const ids = new Set(prev.map((i) => i.id));
      return [...prev, ...result.items.filter((i) => !ids.has(i.id))];
    });
    setCursor(result.nextCursor);
    setHasMore(!!result.nextCursor);
  }, [hasMore, cursor, regionId, user?.id]);

  const updateItem = useCallback((id: string, patch: Partial<ReelItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, activeIndex, setActiveIndex, loadMore, updateItem, refresh: load };
}
