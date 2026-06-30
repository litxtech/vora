import { fetchReels } from '@/features/reels/services/reelsData';
import type { ReelItem } from '@/features/reels/types';

const CACHE_TTL_MS = 90_000;

type ReelsFeedCacheEntry = {
  items: ReelItem[];
  cursor: string | null;
  hasMore: boolean;
  fetchedAt: number;
};

const cache = new Map<string, ReelsFeedCacheEntry>();
let inflightKey: string | null = null;
let inflightPromise: Promise<ReelsFeedCacheEntry | null> | null = null;

function buildKey(regionId: string | null, userId: string | null): string {
  return `${regionId ?? 'all'}:${userId ?? 'anon'}`;
}

export function getCachedReelsFeed(
  regionId: string | null,
  userId: string | null,
): ReelsFeedCacheEntry | null {
  const entry = cache.get(buildKey(regionId, userId));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry;
}

export function setCachedReelsFeed(
  regionId: string | null,
  userId: string | null,
  data: Pick<ReelsFeedCacheEntry, 'items' | 'cursor' | 'hasMore'>,
): void {
  cache.set(buildKey(regionId, userId), {
    ...data,
    fetchedAt: Date.now(),
  });
}

export function invalidateReelsFeedCache(regionId?: string, userId?: string | null): void {
  if (regionId == null) {
    cache.clear();
    return;
  }
  cache.delete(buildKey(regionId, userId ?? null));
}

/** Reels sekmesine girmeden önce feed + ilk videoları hazırla. */
export async function prefetchReelsFeed(
  regionId: string | null,
  userId: string | null,
): Promise<ReelsFeedCacheEntry | null> {
  const key = buildKey(regionId, userId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  if (inflightKey === key && inflightPromise) {
    return inflightPromise;
  }

  inflightKey = key;
  inflightPromise = fetchReels(regionId, userId, null)
    .then((result) => {
      const entry: ReelsFeedCacheEntry = {
        items: result.items,
        cursor: result.nextCursor,
        hasMore: !!result.nextCursor,
        fetchedAt: Date.now(),
      };
      cache.set(key, entry);
      return entry;
    })
    .catch(() => null)
    .finally(() => {
      inflightKey = null;
      inflightPromise = null;
    });

  return inflightPromise;
}
