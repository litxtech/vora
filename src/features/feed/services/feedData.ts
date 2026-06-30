import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import { DEMO_FEED_ITEMS, FEED_PAGE_SIZE } from '@/features/feed/constants';
import { isDemoDataEnabled } from '@/lib/demo/demoData';
import type { FeedAuthor, FeedCategory, FeedItem, FeedQuery, QuotedPostPreview } from '@/features/feed/types';
import { excludeCommunityPosts, excludeReelsFromCommunities } from '@/features/communities/services/publicScope';
import { fetchUnifiedItems } from '@/features/feed/services/unifiedFeed';
import { fetchBoostedAuthorIds, sortFeedWithBoost } from '@/features/feed/services/feedBoost';
import { isPinActive } from '@/features/feed/services/postPinning';
import { fetchQuotedPreviews, resolveQuotedPost } from '@/features/feed/services/quotedPostPreviews';
import { enrichFeedAuthorsInItems } from '@/features/profile/services/businessIdentity';
import { applyBusinessFollowStateToFeedItems } from '@/features/profile/services/businessFollow';
import { filterPostsByAudience, type PostAudience } from '@/features/profile/services/audienceFilter';
import { fetchHiddenAuthors, shouldHideAuthor } from '@/features/moderation/services/relationships';
import { mapPostMusicAttribution, mapPostMusicPlayback, type PostMusicRow } from '@/features/music/services/mapPostMusic';
import { fetchTrustRecordsForPosts } from '@/features/vcts/services/verification';
import { excludeAdEngagementPosts } from '@/features/ads/services/adEngagement';
import { injectFeedBusinessAds } from '@/features/ads/services/feedAdInjection';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import { extractHashtags, normalizeHashtagTag } from '@/features/feed/utils';
import { getMuxPlaybackUrl } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';

const UNIFIED_CATEGORIES: FeedCategory[] = ['job', 'business', 'event', 'lost_found'];

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
  is_ai_account?: boolean;
  account_type?: 'personal' | 'business';
  account_status?: FeedAuthor['accountStatus'];
  hidden_badges?: string[] | null;
};

type PostRow = PostMusicRow & {
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
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_until?: string | null;
  pin_priority?: number;
  created_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
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
    isAiAccount: profile?.is_ai_account ?? false,
    accountType: profile?.account_type ?? 'personal',
    accountStatus,
  };
}

function unwrapProfile(profiles: PostRow['profiles']): ProfileRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function mapCategory(value: string): FeedCategory {
  const allowed: FeedCategory[] = [
    'news',
    'emergency',
    'traffic',
    'event',
    'job',
    'business',
    'lost_found',
    'entertainment',
    'daily',
    'general',
  ];
  return allowed.includes(value as FeedCategory) ? (value as FeedCategory) : 'general';
}

async function fetchEngagementState(
  postIds: string[],
  userId: string | null,
): Promise<{
  liked: Set<string>;
  saved: Set<string>;
  following: Set<string>;
  quoted: Map<string, QuotedPostPreview>;
}> {
  const liked = new Set<string>();
  const saved = new Set<string>();
  const following = new Set<string>();
  const quoted = new Map<string, QuotedPostPreview>();

  if (postIds.length === 0) return { liked, saved, following, quoted };

  const [likesRes, savesRes] = await Promise.all([
    userId
      ? supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    userId
      ? supabase.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  for (const row of likesRes.data ?? []) liked.add(row.post_id);
  for (const row of savesRes.data ?? []) saved.add(row.post_id);

  return { liked, saved, following, quoted };
}

async function fetchFollowingSet(userId: string | null, authorIds: string[]): Promise<Set<string>> {
  const following = new Set<string>();
  if (!userId || authorIds.length === 0) return following;

  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', authorIds);

  for (const row of data ?? []) following.add(row.following_id);
  return following;
}

function mapPostToFeedItem(
  row: PostRow,
  state: {
    liked: Set<string>;
    saved: Set<string>;
    following: Set<string>;
    quoted: Map<string, QuotedPostPreview>;
    trust: Map<string, { trustCode: string; status: string }>;
  },
): FeedItem {
  const profile = unwrapProfile(row.profiles);
  const quoted = resolveQuotedPost(row.quoted_post_id, state.quoted);

  return {
    id: `post-${row.id}`,
    sourceType: 'post',
    sourceId: row.id,
    author: toAuthor(profile, row.author_id),
    title: row.title,
    content: row.content,
    mediaUrls: row.media_urls ?? [],
    category: mapCategory(row.category),
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
    isFollowing: state.following.has(row.author_id),
    quotedPost: quoted,
    isSensitive: row.is_sensitive ?? false,
    isPinned: !!(row.is_pinned && isPinActive(row.pinned_until ?? null)),
    pinnedAt: row.pinned_at ?? null,
    pinnedUntil: row.pinned_until ?? null,
    pinPriority: row.pin_priority ?? 0,
    vctsTrustCode: state.trust.get(row.id)?.trustCode ?? null,
    vctsStatus: state.trust.get(row.id)?.status ?? null,
    music: mapPostMusicAttribution(row),
    musicPlayback: mapPostMusicPlayback(row),
  };
}

const POST_PROFILE_JOIN =
  `profiles!posts_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`;

const POST_MUSIC_JOIN = `music_track_id, music_start_sec, music_end_sec, music_volume, original_audio_volume,
       music_tracks (id, display_title, artist, audio_url, duration_seconds)`;

const POST_SELECT_BASE = `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, audience, is_sensitive, created_at,
       ${POST_MUSIC_JOIN},
       ${POST_PROFILE_JOIN}`;

const POST_SELECT_WITH_PIN = `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, audience, is_sensitive, is_pinned, pinned_at, pinned_until, pin_priority, created_at,
       ${POST_MUSIC_JOIN},
       ${POST_PROFILE_JOIN}`;

/** Migration uygulanmadan önce is_pinned sütunları yoksa legacy select'e düşer. */
let postPinSchemaReady: boolean | null = null;

function isMissingPinColumnError(message: string | undefined): boolean {
  const msg = (message ?? '').toLowerCase();
  return (
    msg.includes('is_pinned') ||
    msg.includes('pinned_at') ||
    msg.includes('pinned_until') ||
    msg.includes('pin_priority')
  );
}

function resolvePostSelect(): string {
  if (postPinSchemaReady === false) return POST_SELECT_BASE;
  return POST_SELECT_WITH_PIN;
}

async function runPostsSelect<T>(
  build: (select: string) => PromiseLike<{ data: T | null; error: { message?: string } | null }>,
): Promise<{ data: T | null; error: { message?: string } | null }> {
  const select = resolvePostSelect();
  const result = await build(select);

  if (result.error && isMissingPinColumnError(result.error.message)) {
    postPinSchemaReady = false;
    const fallback = await build(POST_SELECT_BASE);
    if (!fallback.error) return fallback;
  }

  if (!result.error && postPinSchemaReady === null && select === POST_SELECT_WITH_PIN) {
    postPinSchemaReady = true;
  }

  return result;
}

async function fetchActivePinnedPosts(
  regionId: string | null,
  district: string | null,
  category: FeedQuery['category'],
): Promise<PostRow[]> {
  if (category === 'reels' || category === 'following') return [];
  if (postPinSchemaReady === false) return [];

  let query = excludeAdEngagementPosts(
    excludeCommunityPosts(
    supabase
    .from('posts')
    .select(POST_SELECT_WITH_PIN)
    .eq('status', 'published')
    .eq('is_pinned', true)
  ),
  )
    .or(`pinned_until.is.null,pinned_until.gt.${new Date().toISOString()}`)
    .order('pin_priority', { ascending: false })
    .order('pinned_at', { ascending: false })
    .limit(5);

  if (regionId) query = query.eq('region_id', regionId);
  if (district) query = query.eq('district', district);
  if (category !== 'all' && category !== 'following' && category !== 'general') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingPinColumnError(error.message)) {
      postPinSchemaReady = false;
    }
    return [];
  }

  postPinSchemaReady = true;
  return (data ?? []) as unknown as PostRow[];
}

function filterDemoItems(query: FeedQuery): FeedItem[] {
  let items = query.regionId
    ? DEMO_FEED_ITEMS.filter((item) => item.regionId === query.regionId)
    : [...DEMO_FEED_ITEMS];

  if (query.district) {
    items = items.filter((item) => item.district === query.district);
  }

  if (query.category !== 'all' && query.category !== 'following' && query.category !== 'reels') {
    items = items.filter((item) => item.category === query.category);
  }

  if (query.category === 'following') {
    items = items.filter((item) => item.isFollowing);
  }

  if (query.searchQuery.trim()) {
    const q = query.searchQuery.trim().toLowerCase();
    items = items.filter((item) =>
      [item.title, item.content, item.author.username, item.locationLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  return items;
}

/** İlk sayfada gerçek içerik azsa veya hiç yoksa bölgeye özel örnek haberleri ekler. */
function enrichWithDemoContent(items: FeedItem[], query: FeedQuery): FeedItem[] {
  if (!isDemoDataEnabled()) return items;
  if (query.cursor) return items;
  if (query.category === 'reels' || query.category === 'following') return items;

  const demos = filterDemoItems(query);
  if (items.length === 0) return demos;

  if (query.category !== 'all' && query.category !== 'news') return items;

  const demoNews = demos.filter((item) => item.category === 'news');
  if (demoNews.length === 0) return items;

  const hasNews = items.some((item) => item.category === 'news');
  if (hasNews && items.length >= 5) return items;

  const existingIds = new Set(items.map((item) => item.id));
  const freshDemos = demoNews.filter((item) => !existingIds.has(item.id));
  if (freshDemos.length === 0) return items;

  return [...freshDemos, ...items];
}

function mergeAndSort(
  items: FeedItem[],
  cursor: string | null,
  boostedAuthors: Set<string> = new Set(),
): {
  items: FeedItem[];
  nextCursor: string | null;
} {
  const tagged = items.map((item) =>
    boostedAuthors.has(item.author.id) ? { ...item, isAuthorBoosted: true } : item,
  );
  const sorted = sortFeedWithBoost(tagged, boostedAuthors);

  const filtered = cursor
    ? sorted.filter((item) => item.createdAt < cursor)
    : sorted;

  const page = filtered.slice(0, FEED_PAGE_SIZE);
  const nextCursor =
    filtered.length > FEED_PAGE_SIZE ? page[page.length - 1].createdAt : null;

  return { items: page, nextCursor };
}

export async function fetchFeedPage(query: FeedQuery): Promise<{
  items: FeedItem[];
  nextCursor: string | null;
}> {
  if (query.category === 'reels') {
    return fetchReelsPage(query);
  }

  if (UNIFIED_CATEGORIES.includes(query.category)) {
    const unified = await fetchUnifiedItems(query.regionId, query.category, query.district);
    if (unified.length === 0) {
      return { items: isDemoDataEnabled() ? filterDemoItems(query) : [], nextCursor: null };
    }
    const boostedAuthors = await fetchBoostedAuthorIds([...new Set(unified.map((i) => i.author.id))]);
    const { items: page, nextCursor } = mergeAndSort(unified, query.cursor, boostedAuthors);
    return { items: await enrichFeedAuthorsInItems(page), nextCursor };
  }

  const buildFeedQuery = (select: string) => {
    let q = excludeAdEngagementPosts(
      excludeCommunityPosts(
      supabase
      .from('posts')
      .select(select)
      .eq('status', 'published')
    ),
    )
      .order('created_at', { ascending: false })
      .limit(FEED_PAGE_SIZE);

    if (query.regionId) q = q.eq('region_id', query.regionId);
    if (query.district) q = q.eq('district', query.district);
    if (query.category !== 'all' && query.category !== 'following' && query.category !== 'general') {
      q = q.eq('category', query.category);
    }
    if (query.cursor) q = q.lt('created_at', query.cursor);
    return q;
  };

  const [pinnedResult, feedResult] = await Promise.all([
    !query.cursor ? fetchActivePinnedPosts(query.regionId, query.district, query.category) : Promise.resolve([]),
    runPostsSelect((select) => buildFeedQuery(select)),
  ]);

  const { data, error } = feedResult;
  let rows = (error || !data ? [] : data) as unknown as PostRow[];

  if (!query.cursor && pinnedResult.length > 0) {
    const pinnedIds = new Set(pinnedResult.map((r) => r.id));
    rows = [...pinnedResult, ...rows.filter((r) => !pinnedIds.has(r.id))];
  }

  const visible = await filterPostsByAudience(
    rows.map((r) => ({ id: r.id, authorId: r.author_id, audience: r.audience ?? 'public' })),
    query.userId,
  );
  const allowedIds = new Set(visible.map((v) => v.id));
  rows = rows.filter((r) => allowedIds.has(r.id));

  const postIds = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const quotedIds = rows.map((r) => r.quoted_post_id).filter((id): id is string => !!id);

  const [engagement, following, quotedPreviews, unifiedItems, hidden, trustRecords] = await Promise.all([
    fetchEngagementState(postIds, query.userId),
    fetchFollowingSet(query.userId, authorIds),
    fetchQuotedPreviews(quotedIds),
    query.category === 'all' && !query.cursor
      ? fetchUnifiedItems(query.regionId, 'all', query.district)
      : Promise.resolve([] as FeedItem[]),
    fetchHiddenAuthors(query.userId),
    fetchTrustRecordsForPosts(postIds),
  ]);

  let items = rows
    .filter((row) => !shouldHideAuthor(row.author_id, hidden))
    .map((row) =>
      mapPostToFeedItem(row, { ...engagement, following, quoted: quotedPreviews, trust: trustRecords }),
    );

  if (query.category === 'all') {
    items = [...items, ...unifiedItems];
  }

  if (query.category === 'following') {
    items = items.filter((item) => item.isFollowing);
  }

  if (query.searchQuery.trim()) {
    const q = query.searchQuery.trim().toLowerCase();
    items = items.filter((item) =>
      [item.title, item.content, item.author.username, item.locationLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  if (items.length === 0) {
    const demo = isDemoDataEnabled() ? filterDemoItems(query) : [];
    if (query.category !== 'reels' && query.category !== 'following') {
      const withAds = await injectFeedBusinessAds(demo, query.regionId);
      return { items: withAds, nextCursor: null };
    }
    return { items: demo, nextCursor: null };
  }

  items = enrichWithDemoContent(items, query);

  const boostedAuthors = await fetchBoostedAuthorIds([...new Set(items.map((i) => i.author.id))]);
  const { items: page, nextCursor } = mergeAndSort(items, query.cursor, boostedAuthors);
  const enriched = await enrichFeedAuthorsInItems(page);
  const withFollowState = await applyBusinessFollowStateToFeedItems(enriched, query.userId);

  if (query.category !== 'reels' && query.category !== 'following') {
    const withAds = await injectFeedBusinessAds(withFollowState, query.regionId);
    return {
      items: await applyBusinessFollowStateToFeedItems(withAds, query.userId),
      nextCursor,
    };
  }

  return { items: withFollowState, nextCursor };
}

async function fetchReelsPage(query: FeedQuery): Promise<{
  items: FeedItem[];
  nextCursor: string | null;
}> {
  let dbQuery = supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, view_count, created_at, source_post_id,
       profiles!reels_author_id_fkey (${AUTHOR_PROFILE_FIELDS}),
       videos (thumbnail_url, mux_playback_id)`,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (query.regionId) dbQuery = dbQuery.eq('region_id', query.regionId);

  if (query.cursor) dbQuery = dbQuery.lt('created_at', query.cursor);

  const { data, error } = await dbQuery;
  if (error || !data?.length) return { items: [], nextCursor: null };

  type ReelRow = {
    id: string;
    author_id: string;
    region_id: string;
    caption: string | null;
    like_count: number;
    view_count: number;
    created_at: string;
    source_post_id: string | null;
    profiles: PostRow['profiles'];
    videos: { thumbnail_url: string | null; mux_playback_id: string | null } | { thumbnail_url: string | null; mux_playback_id: string | null }[] | null;
  };

  const rows = await excludeReelsFromCommunities(data as unknown as ReelRow[]);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const following = await fetchFollowingSet(query.userId, authorIds);

  const items: FeedItem[] = rows.map((row) => {
    const profile = unwrapProfile(row.profiles);
    const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
    const playbackUrl = video?.mux_playback_id ? getMuxPlaybackUrl(video.mux_playback_id) : null;
    const thumb = video?.thumbnail_url ?? (video?.mux_playback_id
      ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg`
      : null);

    return {
      id: `reel-${row.id}`,
      sourceType: 'reel',
      sourceId: row.id,
      author: toAuthor(profile, row.author_id),
      title: null,
      content: row.caption ?? '',
      mediaUrls: playbackUrl ? [playbackUrl] : thumb ? [thumb] : [],
      category: 'reels',
      regionId: row.region_id,
      district: null,
      locationLabel: null,
      latitude: null,
      longitude: null,
      likeCount: row.like_count,
      commentCount: 0,
      quoteCount: 0,
      saveCount: 0,
      viewCount: row.view_count,
      createdAt: row.created_at,
      isLiked: false,
      isSaved: false,
      isFollowing: following.has(row.author_id),
      quotedPost: null,
    };
  });

  const nextCursor =
    rows.length === FEED_PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  const enriched = await enrichFeedAuthorsInItems(items);
  return { items: await applyBusinessFollowStateToFeedItems(enriched, query.userId), nextCursor };
}

export async function recordPostView(postId: string): Promise<boolean> {
  if (postId.startsWith('demo-')) return false;

  try {
    const { data, error } = await supabase.rpc('record_post_view', { p_post_id: postId });
    if (error) return false;
    return data ?? false;
  } catch {
    return false;
  }
}

export async function countNewPostsSince(
  regionId: string | null,
  since: string,
): Promise<number> {
  let query = excludeAdEngagementPosts(
    excludeCommunityPosts(
    supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
  ),
  ).gt('created_at', since);

  if (regionId) query = query.eq('region_id', regionId);

  const { count } = await query;

  return count ?? 0;
}

export async function fetchFeedPostById(
  postId: string,
  viewerId: string | null,
): Promise<FeedItem | null> {
  const { data } = await runPostsSelect((select) =>
    supabase
      .from('posts')
      .select(select)
      .eq('id', postId)
      .eq('status', 'published')
      .maybeSingle(),
  );

  if (!data) return null;

  const row = data as unknown as PostRow;
  const quotedIds = row.quoted_post_id ? [row.quoted_post_id] : [];

  const [engagement, following, quotedPreviews, trustRecords] = await Promise.all([
    fetchEngagementState([row.id], viewerId),
    fetchFollowingSet(viewerId, [row.author_id]),
    fetchQuotedPreviews(quotedIds),
    fetchTrustRecordsForPosts([row.id]),
  ]);

  return applyBusinessFollowStateToFeedItems(
    await enrichFeedAuthorsInItems([
      mapPostToFeedItem(row, {
        ...engagement,
        following,
        quoted: quotedPreviews,
        trust: trustRecords,
      }),
    ]),
    viewerId,
  ).then((items) => items[0] ?? null);
}

async function fetchHashtagLinkedPostIds(normalizedTag: string): Promise<string[]> {
  const { data: hashtag } = await supabase
    .from('hashtags')
    .select('id')
    .eq('tag', normalizedTag)
    .maybeSingle();

  if (!hashtag) return [];

  const { data: links, error } = await supabase
    .from('post_hashtags')
    .select('post_id')
    .eq('hashtag_id', hashtag.id);

  if (error) {
    console.warn('[hashtag] post_hashtags read failed:', error.message);
    return [];
  }

  return (links ?? []).map((link) => link.post_id);
}

async function fetchHashtagContentPostIds(normalizedTag: string, limit: number): Promise<string[]> {
  const { data, error } = await excludeCommunityPosts(
    supabase.from('posts').select('id, content').eq('status', 'published'),
  )
    .ilike('content', `%#${normalizedTag}%`)
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 2, 20));

  if (error) {
    console.warn('[hashtag] content search failed:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => extractHashtags(row.content).includes(normalizedTag))
    .map((row) => row.id)
    .slice(0, limit);
}

export async function fetchFeedPostsForHashtag(
  rawTag: string,
  viewerId: string | null,
  limit = 50,
): Promise<{ tag: string; postCount: number; items: FeedItem[] }> {
  const normalized = normalizeHashtagTag(rawTag);
  if (!normalized) {
    return { tag: '', postCount: 0, items: [] };
  }

  const [linkedIds, contentIds] = await Promise.all([
    fetchHashtagLinkedPostIds(normalized),
    fetchHashtagContentPostIds(normalized, limit),
  ]);

  const linkedSet = new Set(linkedIds);
  const postIds = [...new Set([...linkedIds, ...contentIds])];
  if (postIds.length === 0) {
    return { tag: normalized, postCount: 0, items: [] };
  }

  const { data, error } = await runPostsSelect((select) =>
    excludeAdEngagementPosts(
      excludeCommunityPosts(
        supabase.from('posts').select(select).in('id', postIds).eq('status', 'published'),
      ),
    )
      .order('created_at', { ascending: false })
      .limit(limit),
  );

  if (error || !data?.length) {
    if (error) console.warn('[hashtag] fetch posts failed:', error.message);
    return { tag: normalized, postCount: 0, items: [] };
  }

  const rows = (data as unknown as PostRow[]).filter(
    (row) => linkedSet.has(row.id) || extractHashtags(row.content).includes(normalized),
  );

  const visible = await filterPostsByAudience(
    rows.map((row) => ({ id: row.id, authorId: row.author_id, audience: row.audience ?? 'public' })),
    viewerId,
  );
  const allowedIds = new Set(visible.map((entry) => entry.id));
  const filteredRows = rows.filter((row) => allowedIds.has(row.id));

  const ids = filteredRows.map((row) => row.id);
  const authorIds = [...new Set(filteredRows.map((row) => row.author_id))];
  const quotedIds = filteredRows.map((row) => row.quoted_post_id).filter((id): id is string => !!id);

  const [engagement, following, quotedPreviews, hidden, trustRecords] = await Promise.all([
    fetchEngagementState(ids, viewerId),
    fetchFollowingSet(viewerId, authorIds),
    fetchQuotedPreviews(quotedIds),
    fetchHiddenAuthors(viewerId),
    fetchTrustRecordsForPosts(ids),
  ]);

  const items = filteredRows
    .filter((row) => !shouldHideAuthor(row.author_id, hidden))
    .map((row) =>
      mapPostToFeedItem(row, {
        ...engagement,
        following,
        quoted: quotedPreviews,
        trust: trustRecords,
      }),
    );

  const enriched = await applyBusinessFollowStateToFeedItems(
    await enrichFeedAuthorsInItems(items),
    viewerId,
  );

  return { tag: normalized, postCount: enriched.length, items: enriched };
}
