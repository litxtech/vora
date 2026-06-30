import type { BusinessProfile } from '@/features/profile/services/businessProfile';
import type { PublicProfile } from '@/features/profile/types';
import type { FeedAuthor } from '@/features/feed/types';
import type { QuotedPostPreview } from '@/features/feed/types';
import { businessCategoryLabel } from '@/features/businesses/constants';
import { fetchBusinessIdentitiesByOwnerIds } from '@/features/profile/services/businessProfile';
import { fetchIzdivacAppBadgesBatch } from '@/features/izdivac/services/adminIzdivac';

/** Kurumsal doğrulanmış hesaplar — sarı tik */
export const BUSINESS_VERIFIED_COLOR = '#FFB300';
export const BUSINESS_VERIFIED_RING = ['#FFB300', '#FF8F00', '#FFB300'] as const;

export type BusinessIdentitySnapshot = {
  businessId: string;
  name: string;
  category: string;
  categoryLabel: string;
  logoUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  isVerified: boolean;
};

export function toBusinessIdentitySnapshot(business: BusinessProfile & { coverUrl?: string | null }): BusinessIdentitySnapshot {
  return {
    businessId: business.id,
    name: business.name,
    category: business.category,
    categoryLabel: businessCategoryLabel(business.category),
    logoUrl: business.logoUrl,
    coverUrl: business.coverUrl ?? null,
    description: business.description,
    isVerified: business.isVerified,
  };
}

export function enrichPublicProfile(
  profile: PublicProfile,
  business: (BusinessProfile & { coverUrl?: string | null }) | null,
): PublicProfile {
  const legalName = profile.fullName;

  if (profile.accountType !== 'business' || !business) {
    return {
      ...profile,
      displayName: profile.fullName ?? profile.username,
      legalName,
      isBusinessVerified: false,
      businessId: null,
      businessCategory: null,
      businessCategoryLabel: null,
    };
  }

  const identity = toBusinessIdentitySnapshot(business);

  return {
    ...profile,
    displayName: identity.name,
    legalName,
    isBusinessVerified: true,
    businessId: identity.businessId,
    businessCategory: identity.category,
    businessCategoryLabel: identity.categoryLabel,
    avatarUrl: identity.logoUrl ?? profile.avatarUrl,
    coverUrl: identity.coverUrl ?? profile.coverUrl,
    bio: profile.bio?.trim() ? profile.bio : identity.description,
    isVerified: false,
  };
}

export function enrichFeedAuthor(
  author: FeedAuthor,
  identity: BusinessIdentitySnapshot | null | undefined,
): FeedAuthor {
  if (!identity || author.accountType !== 'business') return author;

  return {
    ...author,
    fullName: identity.name,
    displayName: identity.name,
    avatarUrl: identity.logoUrl ?? author.avatarUrl,
    isVerified: false,
    isBusinessVerified: true,
    businessId: identity.businessId,
  };
}

export function authorPublicName(author: Pick<FeedAuthor, 'displayName' | 'fullName' | 'username'>): string {
  return author.displayName ?? author.fullName ?? author.username;
}

export async function enrichQuotedPostPreviews(
  quoted: Map<string, QuotedPostPreview>,
): Promise<Map<string, QuotedPostPreview>> {
  if (quoted.size === 0) return quoted;

  const authorIds = [...new Set([...quoted.values()].map((q) => q.authorId))];
  const identities = await fetchBusinessIdentitiesByOwnerIds(authorIds);

  for (const [postId, preview] of quoted) {
    const biz = identities.get(preview.authorId);
    if (!biz) continue;
    const identity = toBusinessIdentitySnapshot(biz);
    quoted.set(postId, {
      ...preview,
      authorFullName: identity.name,
      authorAvatarUrl: identity.logoUrl ?? preview.authorAvatarUrl,
      authorIsVerified: false,
      authorIsBusinessVerified: true,
    });
  }

  return quoted;
}

export async function enrichFeedAuthorsInItems<T extends { author: FeedAuthor }>(
  items: T[],
): Promise<T[]> {
  if (!items.length) return items;

  const businessOwnerIds = [
    ...new Set(
      items
        .filter((item) => item.author.accountType === 'business')
        .map((item) => item.author.id),
    ),
  ];

  // İzdivaç özel tikleri tüm yazarlar için toplu çekilir (bireysel hesaplar dahil)
  const personalAuthorIds = [
    ...new Set(
      items
        .filter((item) => item.author.accountType !== 'business' && !item.author.id.startsWith('demo-'))
        .map((item) => item.author.id),
    ),
  ];

  const [identities, izdivacBadges] = await Promise.all([
    businessOwnerIds.length
      ? fetchBusinessIdentitiesByOwnerIds(businessOwnerIds)
      : Promise.resolve(new Map()),
    personalAuthorIds.length
      ? fetchIzdivacAppBadgesBatch(personalAuthorIds)
      : Promise.resolve(new Map<string, FeedAuthor['izdivacBadges']>()),
  ]);

  return items.map((item) => {
    if (item.author.accountType === 'business') {
      const biz = identities.get(item.author.id);
      if (!biz) return item;
      return {
        ...item,
        author: enrichFeedAuthor(item.author, toBusinessIdentitySnapshot(biz)),
      };
    }

    const badges = izdivacBadges.get(item.author.id);
    if (!badges || badges.length === 0) return item;
    return {
      ...item,
      author: { ...item.author, izdivacBadges: badges },
    };
  });
}
