import { fetchBusinessDetail } from '@/features/businesses/services/businessDetailData';
import type { BusinessDetail } from '@/features/businesses/types';

const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  detail: BusinessDetail;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<BusinessDetail | null>>();

export function getCachedBusinessDetail(id: string): BusinessDetail | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.detail;
}

export function setCachedBusinessDetail(id: string, detail: BusinessDetail): void {
  cache.set(id, { detail, fetchedAt: Date.now() });
}

export function invalidateBusinessDetailCache(): void {
  cache.clear();
  inflight.clear();
}

export function prefetchBusinessDetail(id: string): void {
  if (!id || getCachedBusinessDetail(id)) return;
  if (inflight.has(id)) return;

  const promise = fetchBusinessDetail(id)
    .then((detail) => {
      if (detail) setCachedBusinessDetail(id, detail);
      return detail;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(id);
    });

  inflight.set(id, promise);
}
