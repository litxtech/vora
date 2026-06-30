import { fetchVoraNeedById } from '@/features/vora-needs/services/needData';
import type { VoraNeedListing } from '@/features/vora-needs/types';

const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  listing: VoraNeedListing;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<VoraNeedListing | null>>();

function buildKey(id: string, userId: string | null): string {
  return `${id}:${userId ?? 'guest'}`;
}

export function getCachedVoraNeedDetail(id: string, userId: string | null): VoraNeedListing | null {
  const entry = cache.get(buildKey(id, userId));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.listing;
}

export function setCachedVoraNeedDetail(
  id: string,
  userId: string | null,
  listing: VoraNeedListing,
): void {
  cache.set(buildKey(id, userId), { listing, fetchedAt: Date.now() });
}

export function invalidateVoraNeedDetailCache(): void {
  cache.clear();
  inflight.clear();
}

export function prefetchVoraNeedDetail(id: string, userId: string | null): void {
  if (!id || getCachedVoraNeedDetail(id, userId)) return;

  const key = buildKey(id, userId);
  if (inflight.has(key)) return;

  const promise = fetchVoraNeedById(id, userId)
    .then((listing) => {
      if (listing) setCachedVoraNeedDetail(id, userId, listing);
      return listing;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
}
