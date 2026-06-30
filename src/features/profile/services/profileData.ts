import type { FeedAuthor, FeedItem } from '@/features/feed/types';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import type { ReelItem } from '@/features/reels/types';
import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import type {
  FollowUser,
  FriendshipStatus,
  ProfileRelationship,
  ProfileStats,
  ProfileTab,
  PublicProfile,
  UserAchievement,
  UserBadge,
} from '@/features/profile/types';
import { filterPostsByAudience, type PostAudience } from '@/features/profile/services/audienceFilter';
import { countMutualFriends } from '@/features/profile/services/mutualFriends';
import { isProfileBoosted } from '@/features/profile/services/profileBoost';
import { enrichPublicProfile, enrichFeedAuthorsInItems } from '@/features/profile/services/businessIdentity';
import { fetchFollowedBusinessIdSet } from '@/features/profile/services/businessFollow';
import { fetchBusinessByOwner } from '@/features/profile/services/businessProfile';
import { excludeCommunityPosts } from '@/features/communities/services/publicScope';
import { excludeAdEngagementPosts } from '@/features/ads/services/adEngagement';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import { supabase } from '@/lib/supabase/client';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  occupation: string | null;
  region_id: string | null;
  district: string | null;
  role: UserRole;
  is_verified: boolean;
  is_platform_charm: boolean;
  is_pioneer: boolean;
  is_platform_supporter: boolean;
  is_premium: boolean;
  izdivac_access_granted: boolean | null;
  hidden_badges: string[] | null;
  gender: GenderId | null;
  account_type: 'personal' | 'business';
  trust_score: number;
  reporter_level: number;
  contribution_score: number;
  verified_content_count: number;
  profile_visibility: 'public' | 'members' | 'friends';
  show_profile_views: boolean;
  show_liked_posts: boolean;
  profile_boosted_until: string | null;
  profile_boost_message: string | null;
  account_status?: PublicProfile['accountStatus'];
  deleted_at?: string | null;
  deleted_by?: PublicProfile['deletedBy'];
  deletion_requested_at?: string | null;
  created_at: string;
  regions: { name: string } | { name: string }[] | null;
};

type PostRow = {
  id: string;
  author_id: string;
  region_id: string;
  title: string | null;
  content: string;
  media_urls: string[];
  category: string;
  district: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  post_type: string;
  like_count: number;
  comment_count: number;
  quote_count: number;
  save_count: number;
  view_count: number;
  quoted_post_id: string | null;
  audience: PostAudience;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    is_verified: boolean;
    is_platform_charm?: boolean;
    is_pioneer?: boolean;
    is_platform_supporter?: boolean;
    gender?: GenderId | null;
    account_type?: 'personal' | 'business';
    account_status?: PublicProfile['accountStatus'];
    hidden_badges?: string[] | null;
  } | null;
};

function unwrapRegion(regions: ProfileRow['regions']): string | null {
  if (!regions) return null;
  return Array.isArray(regions) ? regions[0]?.name ?? null : regions.name;
}

function mapProfile(row: ProfileRow): PublicProfile {
  const accountStatus = row.account_status ?? 'active';
  const hidden = isHiddenPublicAccount(accountStatus);
  const fullName = sanitizeDisplayName(row.full_name, row.username, accountStatus);
  return {
    id: row.id,
    username: row.username,
    displayName: fullName ?? row.username,
    legalName: fullName,
    fullName,
    avatarUrl: sanitizeAvatarUrl(row.avatar_url, accountStatus),
    coverUrl: hidden ? null : row.cover_url,
    bio: hidden ? null : row.bio,
    occupation: hidden ? null : row.occupation,
    regionId: hidden ? null : row.region_id,
    regionName: hidden ? null : unwrapRegion(row.regions),
    district: hidden ? null : row.district,
    role: row.role,
    isVerified: hidden ? false : row.is_verified,
    isBusinessVerified: false,
    businessId: null,
    businessCategory: null,
    businessCategoryLabel: null,
    isPlatformCharm: resolvePlatformCharm(row.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(row.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(row.is_platform_supporter, accountStatus),
    isPremium: hidden ? false : row.is_premium,
    izdivacAccessGranted: hidden ? false : !!row.izdivac_access_granted,
    hiddenBadges: hidden ? [] : (row.hidden_badges ?? []),
    gender: hidden ? null : (row.gender ?? null),
    accountType: row.account_type,
    accountStatus,
    deletedAt: row.deleted_at ?? null,
    deletedBy: row.deleted_by ?? null,
    deletionRequestedAt: row.deletion_requested_at ?? null,
    trustScore: row.trust_score ?? 50,
    reporterLevel: row.reporter_level ?? 1,
    contributionScore: row.contribution_score ?? 0,
    verifiedContentCount: row.verified_content_count ?? 0,
    profileVisibility: row.profile_visibility ?? 'public',
    showProfileViews: row.show_profile_views ?? true,
    showLikedPosts: row.show_liked_posts ?? false,
    profileBoostedUntil: row.profile_boosted_until ?? null,
    profileBoostMessage:
      hidden || !isProfileBoosted(row.profile_boosted_until)
        ? null
        : row.profile_boost_message?.trim() || null,
    createdAt: row.created_at,
  };
}

function toAuthor(profile: PostRow['profiles'], fallbackId: string): FeedAuthor {
  const accountStatus = profile?.account_status ?? 'active';
  const hidden = isHiddenPublicAccount(accountStatus);
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: sanitizeDisplayName(profile?.full_name ?? null, profile?.username ?? null, accountStatus),
    avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
    role: profile?.role ?? 'user',
    isVerified: hidden ? false : (profile?.is_verified ?? false),
    isPlatformCharm: resolvePlatformCharm(profile?.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(profile?.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(profile?.is_platform_supporter, accountStatus),
    hiddenBadges: resolveHiddenBadges(profile?.hidden_badges, accountStatus),
    gender: resolveAuthorGender(profile?.gender, accountStatus),
    accountType: profile?.account_type ?? 'personal',
    accountStatus,
  };
}

function mapPostToFeedItem(row: PostRow, state: { liked: Set<string>; saved: Set<string> }): FeedItem {
  return {
    id: `post-${row.id}`,
    sourceType: 'post',
    sourceId: row.id,
    author: toAuthor(row.profiles, row.author_id),
    title: row.title,
    content: row.content,
    mediaUrls: row.media_urls ?? [],
    category: row.category as FeedItem['category'],
    regionId: row.region_id,
    district: row.district,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    quoteCount: row.quote_count,
    saveCount: row.save_count,
    viewCount: row.view_count,
    createdAt: row.created_at,
    isLiked: state.liked.has(row.id),
    isSaved: state.saved.has(row.id),
    isFollowing: false,
    quotedPost: null,
  };
}

const PROFILE_COLUMNS = `
  id, username, full_name, avatar_url, cover_url, bio, occupation,
  region_id, district, role, is_verified, is_platform_charm, is_pioneer, is_platform_supporter, is_premium,
  izdivac_access_granted, hidden_badges, gender, account_type,
  trust_score, reporter_level, contribution_score, verified_content_count,
  profile_visibility, show_profile_views, show_liked_posts, profile_boosted_until, profile_boost_message,
  account_status, deleted_at, deleted_by, deletion_requested_at, created_at
`;

/** Auth oturumu — select('*') yerine; routing + profil ekranı alanları. */
export const AUTH_SESSION_PROFILE_COLUMNS = `
  ${PROFILE_COLUMNS.trim()},
  onboarding_completed, is_guest, first_name, last_name, birth_date,
  interests, notification_prefs, updated_at
`.replace(/\s+/g, ' ');

type StoredProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  occupation: string | null;
  region_id: string | null;
  district: string | null;
  role: UserRole;
  is_verified: boolean;
  is_platform_charm: boolean;
  is_pioneer: boolean;
  is_platform_supporter: boolean;
  is_premium: boolean;
  izdivac_access_granted: boolean | null;
  hidden_badges: string[] | null;
  gender: GenderId | null;
  account_type: 'personal' | 'business';
  trust_score: number;
  reporter_level: number;
  contribution_score: number;
  verified_content_count: number;
  profile_visibility: 'public' | 'members' | 'friends';
  show_profile_views: boolean;
  show_liked_posts: boolean;
  profile_boosted_until: string | null;
  profile_boost_message: string | null;
  account_status?: PublicProfile['accountStatus'];
  deleted_at?: string | null;
  deleted_by?: PublicProfile['deletedBy'];
  deletion_requested_at?: string | null;
  created_at: string;
};

export function mapStoredProfileToPublic(row: StoredProfileRow, regionName: string | null = null): PublicProfile {
  return mapProfile({
    ...row,
    regions: regionName ? { name: regionName } : null,
  } as ProfileRow);
}

const PROFILE_SELECT = `${PROFILE_COLUMNS}, regions:region_id (name)`;

function regionNameFromJoin(regions: ProfileRow['regions']): string | null {
  return unwrapRegion(regions);
}

export async function fetchProfileById(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as StoredProfileRow & { regions: ProfileRow['regions'] };
  const profile = mapStoredProfileToPublic(row, regionNameFromJoin(row.regions));
  if (profile.accountType !== 'business') return profile;

  const business = await fetchBusinessByOwner(userId);
  return enrichPublicProfile(profile, business);
}

export async function fetchProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('username', username)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as StoredProfileRow & { regions: ProfileRow['regions'] };
  const profile = mapStoredProfileToPublic(row, regionNameFromJoin(row.regions));
  if (profile.accountType !== 'business') return profile;

  const business = await fetchBusinessByOwner(profile.id);
  return enrichPublicProfile(profile, business);
}

export async function fetchProfileStatsCore(userId: string): Promise<ProfileStats> {
  const [followersRes, followingRes, friendCount, postsRes, reelsRes, profileViewsRes] =
    await Promise.all([
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', userId),
      countMutualFriends(userId),
      excludeAdEngagementPosts(
        supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published')
        .in('post_type', ['post', 'incident']),
      ),
      supabase
        .from('reels')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published'),
      supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', userId),
    ]);

  return {
    followerCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
    friendCount,
    postCount: postsRes.count ?? 0,
    reelCount: reelsRes.count ?? 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalQuotes: 0,
    profileViewCount: profileViewsRes.count ?? 0,
  };
}

export async function fetchProfileEngagementTotals(
  userId: string,
): Promise<Pick<ProfileStats, 'totalViews' | 'totalLikes' | 'totalComments' | 'totalQuotes'>> {
  const [viewsRes, engagementRes] = await Promise.all([
    excludeAdEngagementPosts(
      supabase.from('posts').select('view_count').eq('author_id', userId).eq('status', 'published'),
    ),
    excludeAdEngagementPosts(
      supabase
      .from('posts')
      .select('like_count, comment_count, quote_count')
      .eq('author_id', userId)
      .eq('status', 'published'),
    ),
  ]);

  const posts = viewsRes.data ?? [];
  const engagement = engagementRes.data ?? [];

  return {
    totalViews: posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0),
    totalLikes: engagement.reduce((sum, p) => sum + (p.like_count ?? 0), 0),
    totalComments: engagement.reduce((sum, p) => sum + (p.comment_count ?? 0), 0),
    totalQuotes: engagement.reduce((sum, p) => sum + (p.quote_count ?? 0), 0),
  };
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [core, engagement] = await Promise.all([
    fetchProfileStatsCore(userId),
    fetchProfileEngagementTotals(userId),
  ]);

  return { ...core, ...engagement };
}

export async function fetchRelationship(
  viewerId: string | null,
  profileId: string,
): Promise<ProfileRelationship> {
  if (!viewerId || viewerId === profileId) {
    return {
      isFollowing: false,
      friendshipStatus: 'none',
      pendingRequestId: null,
      isBlocked: false,
      blockedByMe: false,
      blockedByThem: false,
      isRestricted: false,
      isMuted: false,
    };
  }

  const [followRes, reverseFollowRes, blockRes, muteRes, blockedByRes, businessRes] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('following_id', profileId)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', profileId)
      .eq('following_id', viewerId)
      .maybeSingle(),
    supabase
      .from('user_blocks')
      .select('blocker_id, is_restricted')
      .eq('blocker_id', viewerId)
      .eq('blocked_id', profileId)
      .maybeSingle(),
    supabase
      .from('user_mutes')
      .select('muter_id')
      .eq('muter_id', viewerId)
      .eq('muted_id', profileId)
      .maybeSingle(),
    supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocker_id', profileId)
      .eq('blocked_id', viewerId)
      .eq('is_restricted', false)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', profileId)
      .eq('registration_status', 'approved')
      .maybeSingle(),
  ]);

  let isFollowing = !!followRes.data;
  const businessId = businessRes.data?.id;
  if (!isFollowing && businessId) {
    const followedBusinesses = await fetchFollowedBusinessIdSet(viewerId, [businessId]);
    isFollowing = followedBusinesses.has(businessId);
  }

  const friendshipStatus: FriendshipStatus =
    followRes.data && reverseFollowRes.data ? 'friends' : 'none';

  const isRestricted = !!blockRes.data?.is_restricted;
  const blockedByMe = !!blockRes.data && !isRestricted;
  const blockedByThem = !!blockedByRes.data;
  const isBlocked = blockedByMe || blockedByThem;

  return {
    isFollowing,
    friendshipStatus,
    pendingRequestId: null,
    isBlocked,
    blockedByMe,
    blockedByThem,
    isRestricted,
    isMuted: !!muteRes.data,
  };
}

export async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_type, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  return (data ?? []).map((b) => ({
    badgeType: b.badge_type as UserBadge['badgeType'],
    earnedAt: b.earned_at,
  }));
}

export async function fetchUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_key, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  return (data ?? []).map((a) => ({
    achievementKey: a.achievement_key,
    earnedAt: a.earned_at,
  }));
}

export async function fetchUserPosts(
  userId: string,
  tab: ProfileTab,
  viewerId: string | null,
  limit = 20,
): Promise<FeedItem[]> {
  if (tab === 'saved') {
    const { data: saves } = await supabase
      .from('post_saves')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const postIds = (saves ?? []).map((s) => s.post_id);
    if (postIds.length === 0) return [];
    return fetchPostsByIds(postIds, viewerId);
  }

  if (tab === 'liked') {
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const postIds = (likes ?? []).map((l) => l.post_id);
    if (postIds.length === 0) return [];
    return fetchPostsByIds(postIds, viewerId);
  }

  let query = excludeAdEngagementPosts(
    excludeCommunityPosts(
    supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, post_type, audience, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, created_at,
       profiles!posts_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
    )
    .eq('author_id', userId)
    .eq('status', 'published')
  ),
  )
    .order('created_at', { ascending: false })
    .limit(limit);

  switch (tab) {
    case 'reels':
      query = query.eq('post_type', 'reel');
      break;
    case 'quotes':
      query = query.eq('post_type', 'quote');
      break;
    case 'media':
      query = query.in('post_type', ['post', 'incident', 'reel']);
      break;
    case 'posts':
    default:
      query = query.in('post_type', ['post', 'incident']);
      break;
  }

  const { data } = await query;
  let rows = (data ?? []) as unknown as PostRow[];
  if (tab === 'media') {
    rows = rows.filter((r) => (r.media_urls?.length ?? 0) > 0);
  }

  if (viewerId !== userId) {
    const visible = await filterPostsByAudience(
      rows.map((r) => ({ id: r.id, authorId: r.author_id, audience: r.audience ?? 'public' })),
      viewerId,
    );
    const allowed = new Set(visible.map((v) => v.id));
    rows = rows.filter((r) => allowed.has(r.id));
  }

  const postIds = rows.map((r) => r.id);
  const state = await fetchEngagementState(postIds, viewerId);
  const items = rows.map((row) => mapPostToFeedItem(row, state));
  return enrichFeedAuthorsInItems(items);
}

async function fetchPostsByIds(postIds: string[], viewerId: string | null): Promise<FeedItem[]> {
  const { data } = await supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, post_type, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, created_at,
       profiles!posts_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
    )
    .in('id', postIds)
    .eq('status', 'published');

  const rows = (data ?? []) as unknown as PostRow[];
  const state = await fetchEngagementState(postIds, viewerId);
  const byId = new Map(rows.map((r) => [r.id, mapPostToFeedItem(r, state)]));
  const ordered = postIds.map((id) => byId.get(id)).filter((item): item is FeedItem => !!item);
  return enrichFeedAuthorsInItems(ordered);
}

async function fetchEngagementState(
  postIds: string[],
  viewerId: string | null,
): Promise<{ liked: Set<string>; saved: Set<string> }> {
  const liked = new Set<string>();
  const saved = new Set<string>();
  if (!viewerId || postIds.length === 0) return { liked, saved };

  const [likesRes, savesRes] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
    supabase.from('post_saves').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
  ]);

  for (const row of likesRes.data ?? []) liked.add(row.post_id);
  for (const row of savesRes.data ?? []) saved.add(row.post_id);
  return { liked, saved };
}

export async function fetchFollowList(
  userId: string,
  type: 'followers' | 'following',
  viewerId: string | null,
  search = '',
): Promise<FollowUser[]> {
  const isFollowers = type === 'followers';
  const column = isFollowers ? 'following_id' : 'follower_id';
  const joinColumn = isFollowers ? 'follower_id' : 'following_id';

  const { data: follows } = await supabase
    .from('follows')
    .select(joinColumn)
    .eq(column, userId);

  const userIds = (follows ?? []).map((f) => f[joinColumn as keyof typeof f] as string);
  if (userIds.length === 0) return [];

  let profileQuery = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, is_verified, trust_score')
    .in('id', userIds);

  if (search.trim()) {
    profileQuery = profileQuery.or(`username.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
  }

  const { data: profiles } = await profileQuery;
  if (!profiles) return [];

  let followingSet = new Set<string>();
  if (viewerId) {
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', profiles.map((p) => p.id));
    followingSet = new Set((myFollows ?? []).map((f) => f.following_id));
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    fullName: p.full_name,
    avatarUrl: p.avatar_url,
    role: p.role as UserRole,
    isVerified: p.is_verified,
    trustScore: (p as { trust_score?: number }).trust_score ?? 50,
    isFollowing: followingSet.has(p.id),
  }));
}

export async function fetchUserReels(
  userId: string,
  viewerId: string | null,
  limit = 30,
): Promise<ReelItem[]> {
  const { data } = await supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, view_count, share_count, save_count, completion_rate, created_at,
       profiles!reels_author_id_fkey (${AUTHOR_PROFILE_FIELDS}),
       videos (mux_playback_id, thumbnail_url, status)`,
    )
    .eq('author_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  type ReelRow = {
    id: string;
    author_id: string;
    region_id: string;
    caption: string | null;
    like_count: number;
    view_count: number;
    share_count: number;
    save_count: number;
    completion_rate: number;
    created_at: string;
    profiles: PostRow['profiles'];
    videos: { mux_playback_id: string | null; thumbnail_url: string | null; status: string } | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }[] | null;
  };

  const rows = (data ?? []) as unknown as ReelRow[];
  const reelIds = rows.map((r) => r.id);

  let liked = new Set<string>();
  let saved = new Set<string>();
  if (viewerId && reelIds.length > 0) {
    const [likesRes, savesRes] = await Promise.all([
      supabase.from('reel_likes').select('reel_id').eq('user_id', viewerId).in('reel_id', reelIds),
      supabase.from('reel_saves').select('reel_id').eq('user_id', viewerId).in('reel_id', reelIds),
    ]);
    liked = new Set((likesRes.data ?? []).map((l) => l.reel_id));
    saved = new Set((savesRes.data ?? []).map((s) => s.reel_id));
  }

  const items: ReelItem[] = [];
  for (const row of rows) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
    if (video?.status !== 'ready' || !video?.mux_playback_id) continue;

    items.push({
      id: row.id,
      playbackId: video.mux_playback_id,
      thumbnailUrl: video.thumbnail_url ?? getMuxThumbnailUrl(video.mux_playback_id),
      caption: row.caption ?? '',
      author: toAuthor(profile, row.author_id),
      regionId: row.region_id,
      district: null,
      locationLabel: null,
      category: null,
      likeCount: row.like_count,
      viewCount: row.view_count,
      shareCount: row.share_count ?? 0,
      saveCount: row.save_count ?? 0,
      completionRate: Number(row.completion_rate ?? 0),
      commentCount: 0,
      createdAt: row.created_at,
      isLiked: liked.has(row.id),
      isSaved: saved.has(row.id),
      isFollowing: false,
    });
  }

  return enrichFeedAuthorsInItems(items);
}

export async function updateProfile(
  userId: string,
  updates: {
    username?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    occupation?: string;
    regionId?: string;
    district?: string;
    address?: string;
    iban?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
    birthDate?: string | null;
    interests?: string[];
    avatarUrl?: string | null;
    coverUrl?: string | null;
    profileVisibility?: PublicProfile['profileVisibility'];
    showProfileViews?: boolean;
    showLikedPosts?: boolean;
  },
): Promise<{ error: string | null }> {
  const fullName =
    updates.firstName !== undefined || updates.lastName !== undefined
      ? [updates.firstName?.trim(), updates.lastName?.trim()].filter(Boolean).join(' ') || null
      : undefined;

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(updates.username !== undefined ? { username: updates.username } : {}),
      first_name: updates.firstName?.trim(),
      last_name: updates.lastName?.trim(),
      full_name: fullName,
      bio: updates.bio,
      occupation: updates.occupation,
      region_id: updates.regionId,
      district: updates.district,
      address: updates.address?.trim() || null,
      iban: updates.iban,
      bank_name: updates.bankName?.trim() || null,
      bank_account_name: updates.bankAccountName?.trim() || null,
      gender: updates.gender,
      birth_date: updates.birthDate,
      interests: updates.interests,
      avatar_url: updates.avatarUrl,
      cover_url: updates.coverUrl,
      profile_visibility: updates.profileVisibility,
      show_profile_views: updates.showProfileViews,
      show_liked_posts: updates.showLikedPosts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { error: supabaseErrorMessage(error) };
}
