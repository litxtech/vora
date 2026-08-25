import { fetchBusinessDetail } from '@/features/businesses/services/businessDetailData';
import type { BusinessDetail } from '@/features/businesses/types';
import type { FeedAuthor } from '@/features/feed/types';
import { businessCategoryLabel } from '@/features/businesses/constants';

const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  detail: BusinessDetail;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<BusinessDetail | null>>();
/** Feed’den gelen iskelet — gerçek fetch gelince temizlenir. */
const seededIds = new Set<string>();

export function getCachedBusinessDetail(id: string): BusinessDetail | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.detail;
}

export function isSeededBusinessDetail(id: string): boolean {
  return seededIds.has(id);
}

export function setCachedBusinessDetail(id: string, detail: BusinessDetail): void {
  cache.set(id, { detail, fetchedAt: Date.now() });
  seededIds.delete(id);
}

export function invalidateBusinessDetailCache(): void {
  cache.clear();
  inflight.clear();
  seededIds.clear();
}

/** Feed yazarından anlık iskelet — header/logo hemen boyansın. */
export function seedBusinessDetailFromAuthor(author: FeedAuthor): void {
  const businessId = author.businessId;
  if (!businessId || author.id.startsWith('demo-')) return;
  if (getCachedBusinessDetail(businessId) && !seededIds.has(businessId)) return;
  if (seededIds.has(businessId)) return;

  const name =
    author.displayName?.trim() ||
    author.fullName?.trim() ||
    author.username;

  setCachedBusinessDetail(businessId, {
    id: businessId,
    name,
    category: 'other',
    categoryLabel: businessCategoryLabel('other'),
    description: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    district: null,
    regionName: null,
    logoUrl: author.avatarUrl,
    coverUrl: null,
    isVerified: Boolean(author.isBusinessVerified),
    latitude: null,
    longitude: null,
    ownerId: author.id,
    viewCount: 0,
    createdAt: null,
  });
  seededIds.add(businessId);
}

export function prefetchBusinessDetail(id: string): void {
  if (!id) return;
  if (inflight.has(id)) return;
  if (getCachedBusinessDetail(id) && !seededIds.has(id)) return;

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
