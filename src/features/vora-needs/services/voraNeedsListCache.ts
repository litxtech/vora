import type { VoraNeedFeedFilters, VoraNeedFeedTab, VoraNeedListing } from '@/features/vora-needs/types';

export type VoraNeedsListCacheEntry = {
  listings: VoraNeedListing[];
  hasMore: boolean;
};

const cache = new Map<string, VoraNeedsListCacheEntry>();

export function buildVoraNeedsListCacheKey(
  tab: VoraNeedFeedTab,
  regionId: string | null,
  userId: string | null,
  filters: VoraNeedFeedFilters,
  center: { latitude: number; longitude: number } | null,
): string {
  const filterPart = JSON.stringify({
    ...filters,
    lat: center ? Math.round(center.latitude * 1000) : null,
    lng: center ? Math.round(center.longitude * 1000) : null,
  });
  return `${tab}|${regionId ?? ''}|${userId ?? 'anon'}|${filterPart}`;
}

export function getCachedVoraNeedsList(key: string): VoraNeedsListCacheEntry | null {
  return cache.get(key) ?? null;
}

export function setCachedVoraNeedsList(key: string, entry: VoraNeedsListCacheEntry): void {
  cache.set(key, entry);
}

export function invalidateVoraNeedsListCache(): void {
  cache.clear();
}
