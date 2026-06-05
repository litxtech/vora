import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { fetchFeedPage } from '@/features/feed/services/feedData';
import type { FeedItem } from '@/features/feed/types';

export function useFeed() {
  const { user } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const district = useFeedStore((s) => s.district);
  const category = useFeedStore((s) => s.category);
  const searchQuery = useFeedStore((s) => s.searchQuery);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latestFetchId = useRef(0);

  const loadInitial = useCallback(async () => {
    const fetchId = ++latestFetchId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFeedPage({
        regionId,
        district,
        category,
        searchQuery,
        followingOnly: category === 'following',
        cursor: null,
        userId: user?.id ?? null,
      });

      if (fetchId !== latestFetchId.current) return;

      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor || result.items.some((i) => i.isDemo));
    } catch {
      if (fetchId === latestFetchId.current) setError('Akış yüklenemedi.');
    } finally {
      if (fetchId === latestFetchId.current) setLoading(false);
    }
  }, [regionId, district, category, searchQuery, user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setCursor(null);
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !cursor) return;

    setLoadingMore(true);
    try {
      const result = await fetchFeedPage({
        regionId,
        district,
        category,
        searchQuery,
        followingOnly: category === 'following',
        cursor,
        userId: user?.id ?? null,
      });

      setItems((prev) => {
        const existing = new Set(prev.map((i) => i.id));
        const merged = [...prev];
        for (const item of result.items) {
          if (!existing.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, cursor, regionId, district, category, searchQuery, user?.id]);

  const updateItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    updateItem,
  };
}
