import type { DiscoveryQuery, DiscoveryResult } from '@/features/discovery/types';
import { LruMap } from '@/lib/cache/lruMap';

export type DiscoveryCacheEntry = {
  result: DiscoveryResult;
  cursor: string | null;
  hasMore: boolean;
};

const MAX_DISCOVERY_CACHE_ENTRIES = 24;
const cache = new LruMap<string, DiscoveryCacheEntry>(MAX_DISCOVERY_CACHE_ENTRIES);

export function buildDiscoveryCacheKey(
  input: Pick<DiscoveryQuery, 'tab' | 'scope' | 'period' | 'regionId' | 'userId'>,
): string {
  return `${input.tab}|${input.scope}|${input.period}|${input.regionId}|${input.userId ?? 'anon'}`;
}

export function getCachedDiscovery(key: string): DiscoveryCacheEntry | null {
  return cache.get(key) ?? null;
}

export function setCachedDiscovery(key: string, entry: DiscoveryCacheEntry): void {
  cache.set(key, entry);
}

export function invalidateDiscoveryCache(): void {
  cache.clear();
}
