import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryArchiveItem } from '@/features/stories/types';
import { fetchStoryArchivePage } from '@/features/stories/services/fetchStoryArchive';

export function useStoryArchive(enabled: boolean) {
  const [items, setItems] = useState<StoryArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const loadPage = useCallback(async (reset: boolean) => {
    if (!enabled || loadingRef.current) return;

    loadingRef.current = true;
    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const page = await fetchStoryArchivePage(cursorRef.current);
      if (page.error) {
        setError(page.error);
        if (reset) setItems([]);
        setHasMore(false);
        return;
      }

      setError(null);
      setHasMore(page.hasMore);

      if (reset) {
        setItems(page.items);
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const merged = [...prev];
          for (const item of page.items) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged;
        });
      }

      const last = page.items[page.items.length - 1];
      cursorRef.current = last?.createdAt ?? cursorRef.current;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void loadPage(true);
  }, [enabled, loadPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(true);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    await loadPage(false);
  }, [hasMore, loadingMore, loading, loadPage]);

  return {
    items,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
