import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { MARKETPLACE_PAGE_SIZE } from '@/features/marketplace/constants';
import { fetchMarketplaceListings } from '@/features/marketplace/services/listingData';
import {
  buildMarketplaceListCacheKey,
  getCachedMarketplaceList,
  setCachedMarketplaceList,
} from '@/features/marketplace/services/marketplaceListCache';
import type { MarketplaceFilters, MarketplaceListing, MarketplaceTab } from '@/features/marketplace/types';

export function useMarketplaceListings(
  tab: MarketplaceTab,
  regionId: string | null,
  userId: string | null,
  filters: MarketplaceFilters = {},
) {
  const paginatedTab = tab !== 'mine' && tab !== 'favorites';

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const cacheKey = useMemo(
    () => buildMarketplaceListCacheKey(tab, regionId, userId, filters, coords),
    [tab, regionId, userId, filters, coords],
  );

  const initialCache = getCachedMarketplaceList(cacheKey);

  const [listings, setListings] = useState<MarketplaceListing[]>(initialCache?.listings ?? []);
  const [loading, setLoading] = useState(!initialCache?.listings.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? true);
  const [error, setError] = useState<string | null>(null);

  const activeKeyRef = useRef(cacheKey);

  const persistCache = useCallback(
    (nextListings: MarketplaceListing[], nextHasMore: boolean) => {
      if (nextListings.length === 0) return;
      setCachedMarketplaceList(cacheKey, { listings: nextListings, hasMore: nextHasMore });
    },
    [cacheKey],
  );

  const refresh = useCallback(
    async (background = false) => {
      if (!background) {
        const cached = getCachedMarketplaceList(cacheKey);
        if (cached?.listings.length) {
          setListings(cached.listings);
          setHasMore(cached.hasMore);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      setError(null);

      let location = coords;
      if ((tab === 'nearby' || filters.sort === 'nearest') && !location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(location);
        }
      }

      if (activeKeyRef.current !== cacheKey) return;

      try {
        const data = await fetchMarketplaceListings(
          tab,
          regionId,
          userId,
          filters,
          location,
          0,
          paginatedTab ? MARKETPLACE_PAGE_SIZE : 50,
        );

        if (activeKeyRef.current !== cacheKey) return;

        const nextHasMore = paginatedTab && data.length >= MARKETPLACE_PAGE_SIZE;
        setListings(data);
        setHasMore(nextHasMore);
        persistCache(data, nextHasMore);
      } catch (e) {
        if (activeKeyRef.current === cacheKey) {
          setError(String(e));
          if (!background) {
            setListings([]);
            setHasMore(false);
          }
        }
      } finally {
        if (activeKeyRef.current === cacheKey) {
          setLoading(false);
        }
      }
    },
    [tab, regionId, userId, filters, coords, paginatedTab, cacheKey, persistCache],
  );

  const loadMore = useCallback(async () => {
    if (!paginatedTab || loadingMore || loading || !hasMore) return;

    setLoadingMore(true);
    const nextOffset = listings.length;

    try {
      const data = await fetchMarketplaceListings(
        tab,
        regionId,
        userId,
        filters,
        coords,
        nextOffset,
        MARKETPLACE_PAGE_SIZE,
      );

      if (activeKeyRef.current !== cacheKey) return;

      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        const merged = [...prev, ...data.filter((l) => !seen.has(l.id))];
        const nextHasMore = data.length >= MARKETPLACE_PAGE_SIZE;
        setHasMore(nextHasMore);
        persistCache(merged, nextHasMore);
        return merged;
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [
    paginatedTab,
    loadingMore,
    loading,
    hasMore,
    listings.length,
    tab,
    regionId,
    userId,
    filters,
    coords,
    cacheKey,
    persistCache,
  ]);

  useEffect(() => {
    activeKeyRef.current = cacheKey;

    const cached = getCachedMarketplaceList(cacheKey);
    if (cached?.listings.length) {
      setListings(cached.listings);
      setHasMore(cached.hasMore);
      setLoading(false);
      void refresh(true);
      return;
    }

    setListings([]);
    setHasMore(true);
    void refresh(false);
  }, [cacheKey, refresh]);

  return { listings, loading, loadingMore, hasMore, error, refresh, loadMore };
}
