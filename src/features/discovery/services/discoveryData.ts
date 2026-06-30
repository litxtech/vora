import { excludeCommunityEvents, excludeCommunityPosts, excludeReelsFromCommunities } from '@/features/communities/services/publicScope';
import { REGIONS } from '@/constants/regions';
import {
  DISCOVERY_FETCH_MULTIPLIER,
  DISCOVERY_PAGE_SIZE,
  parseOffsetCursor,
  periodHours,
  periodStart,
} from '@/features/discovery/constants';
import { fetchActiveFeaturedIds, featuredTrendBoost } from '@/features/discovery/services/discoveryFeatured';
import { computeTrendScore } from '@/features/discovery/services/trendScore';
import { fetchQuotedPreviews, resolveQuotedPost } from '@/features/feed/services/quotedPostPreviews';
import type {
  DiscoveryQuery,
  DiscoveryResult,
  TrendBusiness,
} from '@/features/discovery/types';
import type { EventListing } from '@/features/events/types';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import type { FeedAuthor, FeedItem } from '@/features/feed/types';
import { filterPostsByAudience, type PostAudience } from '@/features/profile/services/audienceFilter';
import type { PersonnelListing } from '@/features/personnel-center/types';
import { fetchTrendHotels } from '@/features/hotel-center/services/hotelData';
import type { ReelItem } from '@/features/reels/types';
import { fetchHiddenAuthors, shouldHideAuthor } from '@/features/moderation/services/relationships';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';
import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';

type ProfileRow = {
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
  account_status?: FeedAuthor['accountStatus'];
  hidden_badges?: string[] | null;
};

function toAuthor(profile: ProfileRow | null | undefined, fallbackId: string): FeedAuthor {
  const accountStatus = profile?.account_status ?? 'active';
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: sanitizeDisplayName(profile?.full_name ?? null, profile?.username ?? null, accountStatus),
    avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
    role: profile?.role ?? 'user',
    isVerified: isHiddenPublicAccount(accountStatus) ? false : (profile?.is_verified ?? false),
    isPlatformCharm: resolvePlatformCharm(profile?.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(profile?.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(profile?.is_platform_supporter, accountStatus),
    hiddenBadges: resolveHiddenBadges(profile?.hidden_badges, accountStatus),
    gender: resolveAuthorGender(profile?.gender, accountStatus),
    accountStatus,
  };
}

function unwrapProfile<T>(profiles: T | T[] | null): T | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function regionFilter(scope: DiscoveryQuery['scope'], regionId: string): string[] {
  return scope === 'karadeniz' ? REGIONS.map((r) => r.id) : [regionId];
}

async function fetchFollowingIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  return new Set((data ?? []).map((r) => r.following_id));
}

async function fetchFollowedBusinessIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase.from('business_follows').select('business_id').eq('user_id', userId);
  return new Set((data ?? []).map((r) => r.business_id));
}

function nextOffsetCursor(offset: number, returned: number, hasMore: boolean): string | null {
  if (!hasMore) return null;
  return String(offset + returned);
}

async function fetchTrendPosts(query: DiscoveryQuery, category: 'general' | 'news'): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const since = periodStart(query.period);
  const hours = periodHours(query.period);
  const regions = regionFilter(query.scope, query.regionId);
  const fetchLimit = DISCOVERY_PAGE_SIZE * DISCOVERY_FETCH_MULTIPLIER;

  let dbQuery = excludeCommunityPosts(
    supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, audience, is_sensitive, created_at,
       profiles!posts_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
    )
    .eq('status', 'published')
  )
    .gte('created_at', since)
    .in('region_id', regions)
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  if (category === 'news') {
    dbQuery = dbQuery.eq('category', 'news');
  } else {
    dbQuery = dbQuery.neq('category', 'news');
  }

  const tab = category === 'news' ? 'news' : 'posts';
  const [postsRes, following, hidden, featured] = await Promise.all([
    dbQuery,
    fetchFollowingIds(query.userId),
    fetchHiddenAuthors(query.userId),
    offset === 0 ? fetchActiveFeaturedIds(tab, query.regionId, query.scope) : Promise.resolve(new Map()),
  ]);

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
    like_count: number;
    comment_count: number;
    quote_count: number;
    save_count: number;
    view_count: number;
    quoted_post_id: string | null;
    audience: PostAudience;
    is_sensitive: boolean;
    created_at: string;
    profiles: ProfileRow | ProfileRow[] | null;
  };

  const rows = (postsRes.data ?? []) as unknown as PostRow[];
  const quotedIds = rows.map((r) => r.quoted_post_id).filter((id): id is string => !!id);

  // Bağımsız iki ağ turu — sıralı yerine paralel: ilk açılış gecikmesini kısaltır.
  const [quotedPreviews, visible] = await Promise.all([
    fetchQuotedPreviews(quotedIds),
    filterPostsByAudience(
      rows.map((r) => ({ id: r.id, authorId: r.author_id, audience: r.audience ?? 'public' })),
      query.userId,
    ),
  ]);
  const allowedIds = new Set(visible.map((v) => v.id));

  const scored = rows
    .filter(
      (row) =>
        allowedIds.has(row.id) &&
        !following.has(row.author_id) &&
        !shouldHideAuthor(row.author_id, hidden),
    )
    .map((row) => {
      const score = computeTrendScore({
        likes: row.like_count,
        comments: row.comment_count,
        quotes: row.quote_count,
        saves: row.save_count,
        views: row.view_count,
        createdAt: row.created_at,
        periodHours: hours,
      });
      const profile = unwrapProfile(row.profiles);
      const item: FeedItem & { trendScore: number } = {
        id: `post-${row.id}`,
        sourceType: 'post',
        sourceId: row.id,
        author: toAuthor(profile, row.author_id),
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
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: resolveQuotedPost(row.quoted_post_id, quotedPreviews),
        isSensitive: row.is_sensitive ?? false,
        trendScore: featuredTrendBoost(row.id, score, featured),
      };
      return item;
    })
    .sort((a, b) => b.trendScore - a.trendScore);

  const page = scored.slice(0, DISCOVERY_PAGE_SIZE);
  const hasMore = scored.length > DISCOVERY_PAGE_SIZE || rows.length === fetchLimit;

  return {
    tab,
    items: page,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

async function fetchTrendReels(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const since = periodStart(query.period);
  const hours = periodHours(query.period);
  const regions = regionFilter(query.scope, query.regionId);
  const fetchLimit = DISCOVERY_PAGE_SIZE * DISCOVERY_FETCH_MULTIPLIER;

  const { data } = await excludeCommunityPosts(
    supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, comment_count, view_count, share_count, save_count, completion_rate, is_sensitive, created_at, source_post_id,
       profiles!reels_author_id_fkey (${AUTHOR_PROFILE_FIELDS}),
       videos (mux_playback_id, thumbnail_url, status)`,
    )
    .eq('status', 'published')
  )
    .gte('created_at', since)
    .in('region_id', regions)
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  const [following, hidden, featured] = await Promise.all([
    fetchFollowingIds(query.userId),
    fetchHiddenAuthors(query.userId),
    offset === 0 ? fetchActiveFeaturedIds('reels', query.regionId, query.scope) : Promise.resolve(new Map()),
  ]);

  type ReelRow = {
    id: string;
    author_id: string;
    region_id: string;
    caption: string | null;
    like_count: number;
    comment_count: number;
    view_count: number;
    share_count: number;
    save_count: number;
    completion_rate: number;
    is_sensitive: boolean;
    created_at: string;
    source_post_id: string | null;
    profiles: ProfileRow | ProfileRow[] | null;
    videos: { mux_playback_id: string | null; thumbnail_url: string | null; status: string } | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }[] | null;
  };

  const rows = await excludeReelsFromCommunities((data ?? []) as unknown as ReelRow[]);

  const scored = rows
    .filter((row) => !following.has(row.author_id) && !shouldHideAuthor(row.author_id, hidden))
    .map((row) => {
      const video = unwrapProfile(row.videos);
      if (video?.status !== 'ready' || !video?.mux_playback_id) return null;

      const score = computeTrendScore({
        likes: row.like_count,
        comments: row.comment_count,
        shares: row.share_count,
        saves: row.save_count,
        views: row.view_count,
        completionRate: row.completion_rate,
        createdAt: row.created_at,
        periodHours: hours,
      });

      const profile = unwrapProfile(row.profiles);
      const item: ReelItem & { trendScore: number } = {
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
        completionRate: row.completion_rate ?? 0,
        commentCount: row.comment_count,
        createdAt: row.created_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        isSensitive: row.is_sensitive ?? false,
        trendScore: featuredTrendBoost(row.id, score, featured),
      };
      return item;
    })
    .filter((item): item is ReelItem & { trendScore: number } => item !== null)
    .sort((a, b) => b.trendScore - a.trendScore);

  const page = scored.slice(0, DISCOVERY_PAGE_SIZE);
  const hasMore = scored.length > DISCOVERY_PAGE_SIZE || rows.length === fetchLimit;

  return {
    tab: 'reels',
    items: page,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

async function fetchTrendEvents(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const since = periodStart(query.period);
  const hours = periodHours(query.period);
  const regions = regionFilter(query.scope, query.regionId);
  const fetchLimit = DISCOVERY_PAGE_SIZE * DISCOVERY_FETCH_MULTIPLIER;

  const { data } = await excludeCommunityEvents(
    supabase
    .from('events')
    .select(
      `id, title, description, category, map_category, starts_at, ends_at, location_name,
       cover_url, region_id, organizer_id, business_id, max_attendees, view_count,
       is_featured, is_sponsored, latitude, longitude, created_at,
       profiles!events_organizer_id_fkey (username, full_name, avatar_url),
       businesses (name)`,
    )
    .eq('status', 'published')
  )
    .gte('created_at', since)
    .in('region_id', regions)
    .order('view_count', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  const following = await fetchFollowingIds(query.userId);
  const featured =
    offset === 0 ? await fetchActiveFeaturedIds('events', query.regionId, query.scope) : new Map();

  type EventRow = {
    id: string;
    title: string;
    description: string;
    category: string;
    map_category: string;
    starts_at: string;
    ends_at: string | null;
    location_name: string | null;
    cover_url: string | null;
    region_id: string;
    organizer_id: string;
    max_attendees: number | null;
    view_count: number;
    is_featured: boolean;
    is_sponsored: boolean;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    profiles: { username: string; full_name: string | null; avatar_url: string | null } | null;
    businesses: { name: string } | { name: string }[] | null;
  };

  const rows = (data ?? []) as unknown as EventRow[];
  const eventIds = rows.map((r) => r.id);

  const { data: rsvpData } = eventIds.length
    ? await supabase.from('event_rsvps').select('event_id, status').in('event_id', eventIds)
    : { data: [] as { event_id: string; status: string }[] };

  const goingCounts = new Map<string, number>();
  for (const rsvp of rsvpData ?? []) {
    if (rsvp.status === 'going') {
      goingCounts.set(rsvp.event_id, (goingCounts.get(rsvp.event_id) ?? 0) + 1);
    }
  }

  const scored = rows
    .filter((row) => !following.has(row.organizer_id))
    .map((row) => {
      const business = unwrapProfile(row.businesses);
      const goingCount = goingCounts.get(row.id) ?? 0;
      const score = computeTrendScore({
        views: row.view_count,
        goingCount,
        isVerified: row.is_featured || row.is_sponsored,
        createdAt: row.created_at,
        periodHours: hours,
      });

      const item: EventListing & { trendScore: number } = {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category as EventListing['category'],
        mapCategory: row.map_category as EventListing['mapCategory'],
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        locationName: row.location_name,
        coverUrl: row.cover_url,
        regionId: row.region_id,
        organizerId: row.organizer_id,
        organizerName: row.profiles?.full_name ?? row.profiles?.username ?? null,
        organizerAvatar: row.profiles?.avatar_url ?? null,
        businessName: business?.name ?? null,
        maxAttendees: row.max_attendees,
        viewCount: row.view_count,
        goingCount,
        maybeCount: 0,
        isFeatured: row.is_featured,
        isSponsored: row.is_sponsored,
        latitude: row.latitude,
        longitude: row.longitude,
        myRsvp: null,
        trendScore: featuredTrendBoost(row.id, score, featured),
      };
      return item;
    })
    .sort((a, b) => b.trendScore - a.trendScore);

  const page = scored.slice(0, DISCOVERY_PAGE_SIZE);
  const hasMore = scored.length > DISCOVERY_PAGE_SIZE || rows.length === fetchLimit;

  return {
    tab: 'events',
    items: page,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

async function fetchTrendBusinesses(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const since = periodStart(query.period);
  const hours = periodHours(query.period);
  const regions = regionFilter(query.scope, query.regionId);
  const fetchLimit = DISCOVERY_PAGE_SIZE * DISCOVERY_FETCH_MULTIPLIER;

  const { data } = await supabase
    .from('businesses')
    .select('id, name, category, description, region_id, district, logo_url, is_verified, view_count, created_at')
    .eq('registration_status', 'approved')
    .gte('created_at', since)
    .in('region_id', regions)
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  const followedBusinesses = await fetchFollowedBusinessIds(query.userId);
  const featured =
    offset === 0 ? await fetchActiveFeaturedIds('businesses', query.regionId, query.scope) : new Map();
  const businessIds = (data ?? []).map((b) => b.id);

  const { data: followCounts } = businessIds.length
    ? await supabase.from('business_follows').select('business_id').in('business_id', businessIds)
    : { data: [] as { business_id: string }[] };

  const followerMap = new Map<string, number>();
  for (const row of followCounts ?? []) {
    followerMap.set(row.business_id, (followerMap.get(row.business_id) ?? 0) + 1);
  }

  const scored = (data ?? [])
    .filter((row) => !followedBusinesses.has(row.id))
    .map((row) => {
      const followerCount = followerMap.get(row.id) ?? 0;
      const score = computeTrendScore({
        views: row.view_count ?? 0,
        followerCount,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        periodHours: hours,
      });

      const item: TrendBusiness = {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        regionId: row.region_id,
        district: row.district,
        logoUrl: row.logo_url,
        isVerified: row.is_verified,
        viewCount: row.view_count ?? 0,
        followerCount,
        trendScore: featuredTrendBoost(row.id, score, featured),
        createdAt: row.created_at,
      };
      return item;
    })
    .sort((a, b) => b.trendScore - a.trendScore);

  const page = scored.slice(0, DISCOVERY_PAGE_SIZE);
  const hasMore = scored.length > DISCOVERY_PAGE_SIZE || (data ?? []).length === fetchLimit;

  return {
    tab: 'businesses',
    items: page,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

async function fetchTrendJobs(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const since = periodStart(query.period);
  const hours = periodHours(query.period);
  const regions = regionFilter(query.scope, query.regionId);
  const fetchLimit = DISCOVERY_PAGE_SIZE * DISCOVERY_FETCH_MULTIPLIER;

  const { data } = await supabase
    .from('job_listings')
    .select(
      `id, title, description, job_type, salary_range, housing_provided, meal_provided,
       district, location_label, is_urgent, latitude, longitude, view_count, created_at, author_id,
       businesses (name, phone)`,
    )
    .eq('status', 'published')
    .gte('created_at', since)
    .in('region_id', regions)
    .order('created_at', { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  const following = await fetchFollowingIds(query.userId);
  const featured =
    offset === 0 ? await fetchActiveFeaturedIds('jobs', query.regionId, query.scope) : new Map();

  type JobRow = {
    id: string;
    title: string;
    description: string;
    job_type: string;
    salary_range: string | null;
    housing_provided: boolean;
    meal_provided: boolean;
    district: string | null;
    location_label: string | null;
    is_urgent: boolean;
    latitude: number | null;
    longitude: number | null;
    view_count: number;
    created_at: string;
    author_id: string;
    businesses: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;
  };

  const rows = (data ?? []) as unknown as JobRow[];

  const scored = rows
    .filter((row) => !following.has(row.author_id))
    .map((row) => {
      const business = unwrapProfile(row.businesses);
      const score = computeTrendScore({
        views: row.view_count,
        isUrgent: row.is_urgent,
        createdAt: row.created_at,
        periodHours: hours,
      });

      const item: PersonnelListing & { trendScore: number } = {
        id: row.id,
        type: 'job',
        ownerId: row.author_id,
        title: row.title,
        description: row.description,
        jobType: row.job_type as PersonnelListing['jobType'],
        salaryRange: row.salary_range,
        housingProvided: row.housing_provided,
        mealProvided: row.meal_provided ?? false,
        district: row.district,
        locationLabel: row.location_label,
        businessName: business?.name ?? null,
        phone: business?.phone ?? null,
        isUrgent: row.is_urgent,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        trendScore: featuredTrendBoost(row.id, score, featured),
      };
      return item;
    })
    .sort((a, b) => b.trendScore - a.trendScore);

  const page = scored.slice(0, DISCOVERY_PAGE_SIZE);
  const hasMore = scored.length > DISCOVERY_PAGE_SIZE || rows.length === fetchLimit;

  return {
    tab: 'jobs',
    items: page,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

async function fetchTrendHotelsDiscovery(query: DiscoveryQuery): Promise<DiscoveryResult> {
  const offset = parseOffsetCursor(query.cursor);
  const regions = regionFilter(query.scope, query.regionId);
  const items = await fetchTrendHotels(regions, offset, DISCOVERY_PAGE_SIZE);
  const hasMore = items.length === DISCOVERY_PAGE_SIZE;

  return {
    tab: 'hotels',
    items,
    nextCursor: nextOffsetCursor(offset, DISCOVERY_PAGE_SIZE, hasMore),
  };
}

export async function fetchDiscoveryPage(query: DiscoveryQuery): Promise<DiscoveryResult> {
  switch (query.tab) {
    case 'posts':
      return fetchTrendPosts(query, 'general');
    case 'news':
      return fetchTrendPosts(query, 'news');
    case 'reels':
      return fetchTrendReels(query);
    case 'events':
      return fetchTrendEvents(query);
    case 'businesses':
      return fetchTrendBusinesses(query);
    case 'jobs':
      return fetchTrendJobs(query);
    case 'hotels':
      return fetchTrendHotelsDiscovery(query);
    default:
      return fetchTrendPosts(query, 'general');
  }
}

