import { fetchMarketplaceListing } from '@/features/marketplace/services/listingData';
import type { MarketplaceListing } from '@/features/marketplace/types';

const CACHE_TTL_MS = 5 * 60_000;

type DetailCacheEntry = {
  listing: MarketplaceListing;
  fetchedAt: number;
};

const cache = new Map<string, DetailCacheEntry>();
const inflight = new Map<string, Promise<MarketplaceListing | null>>();

export function getCachedMarketplaceListing(id: string): MarketplaceListing | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.listing;
}

export function setCachedMarketplaceListing(id: string, listing: MarketplaceListing): void {
  cache.set(id, { listing, fetchedAt: Date.now() });
}

export function invalidateMarketplaceListingCache(id?: string): void {
  if (!id) {
    cache.clear();
    return;
  }
  cache.delete(id);
}

/** Kart tıklanırken detay verisini önceden çek. */
export function prefetchMarketplaceListing(id: string): void {
  if (!id || getCachedMarketplaceListing(id)) return;

  const existing = inflight.get(id);
  if (existing) {
    void existing;
    return;
  }

  const promise = fetchMarketplaceListing(id)
    .then((listing) => {
      if (listing) setCachedMarketplaceListing(id, listing);
      return listing;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(id);
    });

  inflight.set(id, promise);
}
