import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { fetchVoraNeedsFeed } from '@/features/vora-needs/services/needData';
import {
  buildVoraNeedsListCacheKey,
  getCachedVoraNeedsList,
  setCachedVoraNeedsList,
} from '@/features/vora-needs/services/voraNeedsListCache';
import type { VoraNeedFeedFilters, VoraNeedFeedTab, VoraNeedListing } from '@/features/vora-needs/types';
import { NEARBY_NEED_RADIUS_KM } from '@/features/vora-needs/constants';

const PAGE_SIZE = 20;

export function useVoraNeedsFeed(
  tab: VoraNeedFeedTab,
  regionId: string | null,
  userId: string | null,
  filters: VoraNeedFeedFilters = {},
) {
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const cacheKey = useMemo(
    () => buildVoraNeedsListCacheKey(tab, regionId, userId, filters, center),
    [tab, regionId, userId, filters, center],
  );

  const initialCache = getCachedVoraNeedsList(cacheKey);

  const [listings, setListings] = useState<VoraNeedListing[]>(initialCache?.listings ?? []);
  const [loading, setLoading] = useState(!initialCache?.listings.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const hasMoreRef = useRef(initialCache?.hasMore ?? false);
  const loadingMoreRef = useRef(false);
  const activeKeyRef = useRef(cacheKey);
  // filters obje kimliği her render değişebilir; load'u buna bağlamamak için ref'ten oku.
  // İçerik değiştiğinde cacheKey (JSON) zaten değişir ve load yeniden oluşur.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const persistCache = useCallback(
    (nextListings: VoraNeedListing[], nextHasMore: boolean) => {
      if (nextListings.length === 0) return;
      setCachedVoraNeedsList(cacheKey, { listings: nextListings, hasMore: nextHasMore });
    },
    [cacheKey],
  );

  const load = useCallback(
    async (mode: 'refresh' | 'more' = 'refresh', background = false) => {
      const isMore = mode === 'more';
      if (isMore) {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        if (!background) {
          const cached = getCachedVoraNeedsList(cacheKey);
          if (cached?.listings.length) {
            setListings(cached.listings);
            hasMoreRef.current = cached.hasMore;
            setHasMore(cached.hasMore);
            setLoading(false);
          } else {
            setLoading(true);
          }
        }
        setError(null);
        offsetRef.current = 0;
      }

      let coords = center;
      if (tab === 'nearby' && !coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCenter(coords);
        }
      }

      if (activeKeyRef.current !== cacheKey) return;

      try {
        const offset = isMore ? offsetRef.current : 0;
        const data = await fetchVoraNeedsFeed({
          tab,
          viewerRegionId: regionId,
          userId,
          authorId: userId ?? undefined,
          filters: filtersRef.current,
          center: coords ?? undefined,
          radiusKm: tab === 'nearby' ? NEARBY_NEED_RADIUS_KM : undefined,
          limit: PAGE_SIZE,
          offset,
        });

        if (activeKeyRef.current !== cacheKey) return;

        if (isMore) {
          setListings((prev) => {
            const seen = new Set(prev.map((item) => item.id));
            const merged = [...prev, ...data.filter((item) => !seen.has(item.id))];
            const nextHasMore = tab !== 'favorites' && data.length >= PAGE_SIZE;
            hasMoreRef.current = nextHasMore;
            setHasMore(nextHasMore);
            persistCache(merged, nextHasMore);
            return merged;
          });
        } else {
          setListings(data);
          const nextHasMore = tab !== 'favorites' && data.length >= PAGE_SIZE;
          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
          persistCache(data, nextHasMore);
        }

        offsetRef.current = offset + data.length;
      } catch (err) {
        if (!isMore && activeKeyRef.current === cacheKey && !background) {
          setError(String(err));
          setListings([]);
          hasMoreRef.current = false;
          setHasMore(false);
        }
      } finally {
        if (isMore) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else if (activeKeyRef.current === cacheKey) {
          setLoading(false);
        }
      }
    },
    [tab, regionId, userId, center, cacheKey, persistCache],
  );

  useEffect(() => {
    activeKeyRef.current = cacheKey;

    const cached = getCachedVoraNeedsList(cacheKey);
    if (cached?.listings.length) {
      setListings(cached.listings);
      hasMoreRef.current = cached.hasMore;
      setHasMore(cached.hasMore);
      setLoading(false);
      void load('refresh', true);
      return;
    }

    setListings([]);
    hasMoreRef.current = false;
    setHasMore(false);
    void load('refresh', false);
  }, [cacheKey, load]);

  const refresh = useCallback(() => load('refresh', false), [load]);
  const loadMore = useCallback(() => load('more'), [load]);

  return { listings, loading, loadingMore, hasMore, error, refresh, loadMore, center };
}
