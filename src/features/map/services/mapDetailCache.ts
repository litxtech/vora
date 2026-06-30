import { fetchMapDetail } from '@/features/map/services/detail';
import type { MapDetailRecord } from '@/features/map/services/detail';
import type { MapDetailType } from '@/features/map/types';
import { LruMap } from '@/lib/cache/lruMap';

const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 80;

type CacheEntry = {
  record: MapDetailRecord;
  fetchedAt: number;
};

const cache = new LruMap<string, CacheEntry>(MAX_CACHE_ENTRIES);
const inflight = new Map<string, Promise<MapDetailRecord | null>>();

function buildKey(type: MapDetailType, id: string): string {
  return `${type}:${id}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt > CACHE_TTL_MS;
}

export function getCachedMapDetail(type: MapDetailType, id: string): MapDetailRecord | null {
  const key = buildKey(type, id);
  const entry = cache.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    cache.delete(key);
    return null;
  }
  return entry.record;
}

export function setCachedMapDetail(type: MapDetailType, id: string, record: MapDetailRecord): void {
  cache.set(buildKey(type, id), { record, fetchedAt: Date.now() });
}

export function invalidateMapDetailCache(): void {
  cache.clear();
  inflight.clear();
}

export function prefetchMapDetail(type: MapDetailType, id: string): void {
  if (!id || getCachedMapDetail(type, id)) return;

  const key = buildKey(type, id);
  if (inflight.has(key)) return;

  const promise = fetchMapDetail(type, id)
    .then((record) => {
      if (record) setCachedMapDetail(type, id, record);
      return record;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
}
