import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFeedStore } from '@/features/feed/store/feedStore';
import {
  buildFeedCacheKey,
  readDiskFeedCache,
  readMemoryFeedCache,
  writeFeedCache,
} from '@/features/feed/services/feedCache';
import { fetchFeedPage } from '@/features/feed/services/feedData';
import type { FeedItem } from '@/features/feed/types';
import { shouldRefreshInBackground, shouldUseSilentListRefresh } from '@/lib/ui/listRefresh';

const PENDING_FOLLOW_TTL_MS = 8000;

function applyPendingFollowState(item: FeedItem, pending: Map<string, boolean>): FeedItem {
  const override = pending.get(item.author.id);
  if (override === undefined) return item;
  return { ...item, isFollowing: override };
}

function mergeBackgroundFeedItems(
  prev: FeedItem[],
  fresh: FeedItem[],
  pending: Map<string, boolean>,
): FeedItem[] {
  return [
    ...fresh.map((item) => applyPendingFollowState(item, pending)),
    ...prev
      .filter((item) => !fresh.some((freshItem) => freshItem.id === item.id))
      .map((item) => applyPendingFollowState(item, pending)),
  ];
}

export function useFeed() {
  const { user, isLoading: authLoading } = useAuth();
  const regionId = useFeedStore((s) => s.regionId);
  const district = useFeedStore((s) => s.district);
  const category = useFeedStore((s) => s.category);
  const searchQuery = useFeedStore((s) => s.searchQuery);

  const cacheKey = useMemo(
    () =>
      buildFeedCacheKey({
        regionId,
        district,
        category,
        searchQuery,
        userId: user?.id ?? null,
      }),
    [regionId, district, category, searchQuery, user?.id],
  );

  const initialCache = readMemoryFeedCache(cacheKey);

  const [items, setItems] = useState<FeedItem[]>(initialCache?.items ?? []);
  const [loading, setLoading] = useState(!initialCache?.items.length);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(initialCache?.cursor ?? null);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? true);
  const [error, setError] = useState<string | null>(null);

  const latestFetchId = useRef(0);
  const activeKeyRef = useRef(cacheKey);
  const itemsRef = useRef(items);
  const pendingFollowOverridesRef = useRef<Map<string, boolean>>(new Map());
  itemsRef.current = items;

  const markPendingFollow = useCallback((authorId: string, isFollowing: boolean) => {
    pendingFollowOverridesRef.current.set(authorId, isFollowing);
    setTimeout(() => {
      if (pendingFollowOverridesRef.current.get(authorId) === isFollowing) {
        pendingFollowOverridesRef.current.delete(authorId);
      }
    }, PENDING_FOLLOW_TTL_MS);
  }, []);

  const persistCache = useCallback(
    (nextItems: FeedItem[], nextCursor: string | null, nextHasMore: boolean) => {
      if (nextItems.length === 0) return;
      void writeFeedCache({
        cacheKey,
        items: nextItems,
        cursor: nextCursor,
        hasMore: nextHasMore,
        savedAt: Date.now(),
      });
    },
    [cacheKey],
  );

  const applyPageResult = useCallback(
    (prev: FeedItem[], fresh: FeedItem[], nextCursor: string | null, background: boolean) => {
      const nextHasMore = !!nextCursor || fresh.some((i) => i.isDemo);
      const pending = pendingFollowOverridesRef.current;
      const merged =
        background && prev.length > 0
          ? mergeBackgroundFeedItems(prev, fresh, pending)
          : fresh.map((item) => applyPendingFollowState(item, pending));

      persistCache(merged, nextCursor, nextHasMore);
      setCursor(nextCursor);
      setHasMore(nextHasMore);
      return merged;
    },
    [persistCache],
  );

  const loadInitial = useCallback(
    async (background: boolean) => {
      const fetchId = ++latestFetchId.current;
      if (!background) {
        setLoading(true);
      }
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

        setItems((prev) => applyPageResult(prev, result.items, result.nextCursor, background));
      } catch {
        if (fetchId === latestFetchId.current) {
          setItems((prev) => {
            if (!background && prev.length === 0) setError('Akış yüklenemedi.');
            return prev;
          });
        }
      } finally {
        if (fetchId === latestFetchId.current && !background) {
          setLoading(false);
        }
      }
    },
    [applyPageResult, regionId, district, category, searchQuery, user?.id],
  );

  const refresh = useCallback(async () => {
    const background = shouldRefreshInBackground(itemsRef.current.length > 0);
    if (!shouldUseSilentListRefresh()) setRefreshing(true);
    setCursor(null);
    await loadInitial(background);
    if (!shouldUseSilentListRefresh()) setRefreshing(false);
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
        const pending = pendingFollowOverridesRef.current;
        const merged = [...prev];
        for (const item of result.items) {
          if (!existing.has(item.id)) {
            merged.push(applyPendingFollowState(item, pending));
          }
        }
        persistCache(merged, result.nextCursor, !!result.nextCursor);
        return merged;
      });
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, cursor, regionId, district, category, searchQuery, user?.id, persistCache]);

  const updateItem = useCallback(
    (id: string, patch: Partial<FeedItem>) => {
      setItems((prev) => {
        let authorId: string | null = null;
        if ('isFollowing' in patch && patch.isFollowing !== undefined) {
          const target = prev.find((item) => item.id === id);
          authorId = target?.author.id ?? null;
          if (authorId) markPendingFollow(authorId, patch.isFollowing);
        }

        const next = prev.map((item) => {
          if (item.id === id) return { ...item, ...patch };
          if (authorId && item.author.id === authorId && patch.isFollowing !== undefined) {
            return { ...item, isFollowing: patch.isFollowing };
          }
          return item;
        });
        persistCache(next, cursor, hasMore);
        return next;
      });
    },
    [cursor, hasMore, markPendingFollow, persistCache],
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        persistCache(next, cursor, hasMore);
        return next;
      });
    },
    [cursor, hasMore, persistCache],
  );

  useEffect(() => {
    if (authLoading && !user?.id) return;

    let active = true;
    activeKeyRef.current = cacheKey;

    const run = async () => {
      latestFetchId.current += 1;

      let cached = readMemoryFeedCache(cacheKey);
      if (!cached?.items.length) {
        cached = (await readDiskFeedCache(cacheKey)) ?? undefined;
      }
      if (!active || activeKeyRef.current !== cacheKey) return;

      if (cached?.items.length) {
        setItems(cached.items);
        setCursor(cached.cursor);
        setHasMore(cached.hasMore);
        setLoading(false);
        setError(null);
        void loadInitial(true);
        return;
      }

      setItems([]);
      setCursor(null);
      setHasMore(true);
      void loadInitial(false);
    };

    void run();

    return () => {
      active = false;
    };
  }, [cacheKey, loadInitial, authLoading, user?.id]);

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
    removeItem,
  };
}
