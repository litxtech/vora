import type { RegionId } from '@/constants/regions';
import type { FeedItem } from '@/features/feed/types';
import type { AdCtaLabel } from '@/features/ads/types';
import { pickBusinessAdForUser, type ServedBusinessAd } from '@/features/ads/services/adServing';
import { enrichFeedAuthorsInItems } from '@/features/profile/services/businessIdentity';
import { supabase } from '@/lib/supabase/client';

/** İlk reklam kaçıncı gönderiden sonra yerleşir. */
const FIRST_AD_AFTER = 2;
/** İlk reklamdan sonra ek reklamlar arası gönderi sayısı. */
const NEXT_AD_EVERY = 8;
const MAX_ADS_PER_PAGE = 2;

type OwnerProfile = {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: 'personal' | 'business';
};

type AdEngagement = {
  postId: string | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
};

async function fetchAdOwner(ownerId: string): Promise<OwnerProfile> {
  const { data } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url, account_type')
    .eq('id', ownerId)
    .maybeSingle();

  return {
    username: data?.username ?? 'kullanici',
    full_name: data?.full_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    account_type: data?.account_type ?? 'personal',
  };
}

async function fetchAdEngagement(adId: string, userId: string | null): Promise<AdEngagement> {
  const { data: post } = await supabase
    .from('posts')
    .select('id, like_count, comment_count')
    .eq('business_ad_id', adId)
    .maybeSingle();

  if (!post) {
    return { postId: null, likeCount: 0, commentCount: 0, isLiked: false };
  }

  let isLiked = false;
  if (userId) {
    const { data: like } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', post.id)
      .eq('user_id', userId)
      .maybeSingle();
    isLiked = Boolean(like);
  }

  return {
    postId: post.id,
    likeCount: post.like_count ?? 0,
    commentCount: post.comment_count ?? 0,
    isLiked,
  };
}

function servedAdToFeedItem(
  ad: ServedBusinessAd,
  owner: OwnerProfile,
  regionId: string,
  engagement: AdEngagement,
): FeedItem {
  const now = new Date().toISOString();
  return {
    id: `business-ad-${ad.id}`,
    sourceType: 'business_ad',
    sourceId: ad.id,
    author: {
      id: ad.ownerId,
      username: owner.username,
      fullName: owner.full_name,
      avatarUrl: owner.avatar_url,
      role: 'user',
      isVerified: false,
      accountType: owner.account_type,
    },
    title: ad.title,
    content: ad.description,
    mediaUrls: ad.imageUrl ? [ad.imageUrl] : [],
    category: 'general',
    regionId,
    district: null,
    locationLabel: null,
    latitude: null,
    longitude: null,
    likeCount: engagement.likeCount,
    commentCount: engagement.commentCount,
    quoteCount: 0,
    saveCount: 0,
    viewCount: 0,
    createdAt: now,
    isLiked: engagement.isLiked,
    isSaved: false,
    isFollowing: false,
    quotedPost: null,
    isSponsored: true,
    businessAdId: ad.id,
    engagementPostId: engagement.postId,
    adCtaLabel: ad.ctaLabel as AdCtaLabel,
    adDestinationUrl: ad.destinationUrl,
  };
}

/** Feed sayfasına aktif reklamları aralıklı olarak yerleştirir. */
export async function injectFeedBusinessAds(
  items: FeedItem[],
  regionId: RegionId | string | null,
): Promise<FeedItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return items;
  if (items.some((item) => item.sourceType === 'business_ad')) return items;

  const displayRegion = regionId ?? 'trabzon';
  const pickRegion = regionId ?? null;
  const usedAdIds = new Set<string>();
  let adsInjected = 0;

  const buildAdItem = async (ad: ServedBusinessAd) => {
    const [owner, engagement] = await Promise.all([
      fetchAdOwner(ad.ownerId),
      fetchAdEngagement(ad.id, user.id),
    ]);
    const [item] = await enrichFeedAuthorsInItems([
      servedAdToFeedItem(ad, owner, displayRegion, engagement),
    ]);
    return item;
  };

  // Boş feed'de bile tek reklam göster (aktif reklam varsa).
  if (items.length === 0) {
    const { ad } = await pickBusinessAdForUser('feed', pickRegion);
    if (!ad) return items;
    return [await buildAdItem(ad)];
  }

  const result: FeedItem[] = [];
  const firstAdSlot = Math.min(FIRST_AD_AFTER, items.length);

  for (let i = 0; i < items.length; i++) {
    result.push(items[i]);
    if (adsInjected >= MAX_ADS_PER_PAGE) continue;

    const itemNumber = i + 1;
    const isFirstSlot = adsInjected === 0 && itemNumber === firstAdSlot;
    const isNextSlot = adsInjected > 0 && itemNumber % NEXT_AD_EVERY === 0;
    if (!isFirstSlot && !isNextSlot) continue;

    const { ad } = await pickBusinessAdForUser('feed', pickRegion);
    if (!ad || usedAdIds.has(ad.id)) continue;

    usedAdIds.add(ad.id);
    result.push(await buildAdItem(ad));
    adsInjected += 1;
  }

  // Az gönderili feed'lerde en az bir reklam garantisi.
  if (adsInjected === 0) {
    const { ad } = await pickBusinessAdForUser('feed', pickRegion);
    if (ad && !usedAdIds.has(ad.id)) {
      result.push(await buildAdItem(ad));
    }
  }

  return result;
}
