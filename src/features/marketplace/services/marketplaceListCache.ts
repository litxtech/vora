import type { MarketplaceFilters, MarketplaceListing, MarketplaceTab } from '@/features/marketplace/types';
import { LruMap } from '@/lib/cache/lruMap';

export type MarketplaceListCacheEntry = {
  listings: MarketplaceListing[];
  hasMore: boolean;
};

const MAX_CACHE_ENTRIES = 24;
const cache = new LruMap<string, MarketplaceListCacheEntry>(MAX_CACHE_ENTRIES);

export function buildMarketplaceListCacheKey(
  tab: MarketplaceTab,
  regionId: string | null,
  userId: string | null,
  filters: MarketplaceFilters,
  coords: { lat: number; lng: number } | null,
): string {
  const filterPart = JSON.stringify({
    ...filters,
    lat: coords ? Math.round(coords.lat * 1000) : null,
    lng: coords ? Math.round(coords.lng * 1000) : null,
  });
  return `${tab}|${regionId ?? ''}|${userId ?? 'anon'}|${filterPart}`;
}

export function getCachedMarketplaceList(key: string): MarketplaceListCacheEntry | null {
  return cache.get(key) ?? null;
}

export function setCachedMarketplaceList(key: string, entry: MarketplaceListCacheEntry): void {
  cache.set(key, entry);
}

export function invalidateMarketplaceListCache(): void {
  cache.clear();
}
