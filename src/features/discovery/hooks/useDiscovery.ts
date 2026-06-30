import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchDiscoveryPage } from '@/features/discovery/services/discoveryData';
import {
  buildDiscoveryCacheKey,
  getCachedDiscovery,
  setCachedDiscovery,
} from '@/features/discovery/services/discoverySessionCache';
import { useDiscoveryStore } from '@/features/discovery/store/discoveryStore';
import type { DiscoveryResult } from '@/features/discovery/types';
import { shouldUseSilentListRefresh } from '@/lib/ui/listRefresh';
import { useAuth } from '@/providers/AuthProvider';

type DiscoveryState = {
  result: DiscoveryResult | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
};

const EMPTY: DiscoveryState = {
  result: null,
  loading: true,
  refreshing: false,
  loadingMore: false,
  hasMore: true,
  error: null,
};

export function useDiscovery(enabled = true) {
  const { user } = useAuth();
  const tab = useDiscoveryStore((s) => s.tab);
  const scope = useDiscoveryStore((s) => s.scope);
  const period = useDiscoveryStore((s) => s.period);
  const regionId = useDiscoveryStore((s) => s.regionId);

  const cacheKey = useMemo(
    () =>
      buildDiscoveryCacheKey({
        tab,
        scope,
        period,
        regionId,
        userId: user?.id ?? null,
      }),
    [tab, scope, period, regionId, user?.id],
  );

  const initialCache = getCachedDiscovery(cacheKey);

  const [state, setState] = useState<DiscoveryState>(() =>
    initialCache
      ? {
          result: initialCache.result,
          loading: false,
          refreshing: false,
          loadingMore: false,
          hasMore: initialCache.hasMore,
          error: null,
        }
      : EMPTY,
  );
  const cursorRef = useRef<string | null>(initialCache?.cursor ?? null);
  const latestFetchId = useRef(0);
  const activeKeyRef = useRef(cacheKey);

  const persistCache = useCallback(
    (result: DiscoveryResult, nextCursor: string | null, nextHasMore: boolean) => {
      setCachedDiscovery(cacheKey, {
        result,
        cursor: nextCursor,
        hasMore: nextHasMore,
      });
    },
    [cacheKey],
  );

  const loadInitial = useCallback(
    async (background = false) => {
      const fetchId = ++latestFetchId.current;
      cursorRef.current = null;
      setState((prev) => ({
        ...prev,
        loading: background ? false : true,
        error: null,
      }));

      try {
        const result = await fetchDiscoveryPage({
          tab,
          scope,
          period,
          regionId,
          userId: user?.id ?? null,
          cursor: null,
        });

        if (fetchId !== latestFetchId.current || activeKeyRef.current !== cacheKey) return;

        cursorRef.current = result.nextCursor;
        const nextHasMore = !!result.nextCursor;
        persistCache(result, result.nextCursor, nextHasMore);
        setState({
          result,
          loading: false,
          refreshing: false,
          loadingMore: false,
          hasMore: nextHasMore,
          error: null,
        });
      } catch {
        if (fetchId === latestFetchId.current && activeKeyRef.current === cacheKey) {
          setState((prev) => ({
            ...prev,
            loading: false,
            refreshing: false,
            error: prev.result ? null : 'Keşfet içeriği yüklenemedi.',
          }));
        }
      }
    },
    [tab, scope, period, regionId, user?.id, cacheKey, persistCache],
  );

  const refresh = useCallback(async () => {
    if (!shouldUseSilentListRefresh()) {
      setState((prev) => ({ ...prev, refreshing: true }));
    }
    await loadInitial(true);
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || state.loadingMore || state.loading) return;

    setState((prev) => ({ ...prev, loadingMore: true }));

    try {
      const result = await fetchDiscoveryPage({
        tab,
        scope,
        period,
        regionId,
        userId: user?.id ?? null,
        cursor: cursorRef.current,
      });

      if (activeKeyRef.current !== cacheKey) return;

      cursorRef.current = result.nextCursor;

      setState((prev) => {
        if (!prev.result || prev.result.tab !== result.tab) {
          const nextHasMore = !!result.nextCursor;
          persistCache(result, result.nextCursor, nextHasMore);
          return {
            ...prev,
            result,
            loadingMore: false,
            hasMore: nextHasMore,
          };
        }

        const merged = mergeResults(prev.result, result);
        const nextHasMore = !!result.nextCursor;
        persistCache(merged, result.nextCursor, nextHasMore);
        return {
          ...prev,
          result: merged,
          loadingMore: false,
          hasMore: nextHasMore,
        };
      });
    } finally {
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [tab, scope, period, regionId, user?.id, state.loadingMore, state.loading, cacheKey, persistCache]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    activeKeyRef.current = cacheKey;

    const run = async () => {
      latestFetchId.current += 1;

      const cached = getCachedDiscovery(cacheKey);
      if (!active || activeKeyRef.current !== cacheKey) return;

      if (cached?.result) {
        setState({
          result: cached.result,
          loading: false,
          refreshing: false,
          loadingMore: false,
          hasMore: cached.hasMore,
          error: null,
        });
        cursorRef.current = cached.cursor;
        await loadInitial(true);
        return;
      }

      setState(EMPTY);
      cursorRef.current = null;
      await loadInitial(false);
    };

    void run();

    return () => {
      active = false;
    };
  }, [enabled, cacheKey, loadInitial]);

  return {
    ...state,
    refresh,
    loadMore,
  };
}

function mergeResults(prev: DiscoveryResult, next: DiscoveryResult): DiscoveryResult {
  if (prev.tab !== next.tab) return next;

  switch (prev.tab) {
    case 'posts':
    case 'news':
      if (next.tab !== 'posts' && next.tab !== 'news') return next;
      return { tab: prev.tab, items: [...prev.items, ...next.items], nextCursor: next.nextCursor };
    case 'reels':
      if (next.tab !== 'reels') return next;
      return { tab: 'reels', items: [...prev.items, ...next.items], nextCursor: next.nextCursor };
    case 'events':
      if (next.tab !== 'events') return next;
      return { tab: 'events', items: [...prev.items, ...next.items], nextCursor: next.nextCursor };
    case 'businesses':
      if (next.tab !== 'businesses') return next;
      return { tab: 'businesses', items: [...prev.items, ...next.items], nextCursor: next.nextCursor };
    case 'jobs':
      if (next.tab !== 'jobs') return next;
      return { tab: 'jobs', items: [...prev.items, ...next.items], nextCursor: next.nextCursor };
    default:
      return next;
  }
}
