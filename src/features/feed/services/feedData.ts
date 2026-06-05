import { DEMO_FEED_ITEMS, FEED_PAGE_SIZE } from '@/features/feed/constants';
import type { FeedAuthor, FeedCategory, FeedItem, FeedQuery } from '@/features/feed/types';
import { fetchUnifiedItems } from '@/features/feed/services/unifiedFeed';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const UNIFIED_CATEGORIES: FeedCategory[] = ['job', 'business', 'event', 'lost_found'];

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
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
  like_count: number;
  comment_count: number;
  quote_count: number;
  save_count: number;
  view_count: number;
  quoted_post_id: string | null;
  created_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

function toAuthor(profile: ProfileRow | null | undefined, fallbackId: string): FeedAuthor {
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.is_verified ?? false,
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
  quoted: Map<string, { id: string; authorUsername: string; content: string; mediaUrls: string[] }>;
}> {
  const liked = new Set<string>();
  const saved = new Set<string>();
  const following = new Set<string>();
  const quoted = new Map<string, { id: string; authorUsername: string; content: string; mediaUrls: string[] }>();

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

async function fetchQuotedPreviews(
  quotedIds: string[],
): Promise<Map<string, { id: string; authorUsername: string; content: string; mediaUrls: string[] }>> {
  const quoted = new Map<string, { id: string; authorUsername: string; content: string; mediaUrls: string[] }>();
  if (quotedIds.length === 0) return quoted;

  const { data } = await supabase
    .from('posts')
    .select('id, content, media_urls, profiles!posts_author_id_fkey (username)')
    .in('id', quotedIds);

  const rows = (data ?? []) as Array<{
    id: string;
    content: string;
    media_urls: string[];
    profiles: PostRow['profiles'];
  }>;

  for (const row of rows) {
    const profile = unwrapProfile(row.profiles);
    quoted.set(row.id, {
      id: row.id,
      authorUsername: profile?.username ?? 'kullanici',
      content: row.content,
      mediaUrls: row.media_urls ?? [],
    });
  }

  return quoted;
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
    quoted: Map<string, { id: string; authorUsername: string; content: string; mediaUrls: string[] }>;
  },
): FeedItem {
  const profile = unwrapProfile(row.profiles);
  const quoted = row.quoted_post_id ? state.quoted.get(row.quoted_post_id) ?? null : null;

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
  };
}

function filterDemoItems(query: FeedQuery): FeedItem[] {
  let items = DEMO_FEED_ITEMS.filter((item) => item.regionId === query.regionId);

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

function mergeAndSort(items: FeedItem[], cursor: string | null): {
  items: FeedItem[];
  nextCursor: string | null;
} {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
    if (unified.length === 0) return { items: filterDemoItems(query), nextCursor: null };
    return mergeAndSort(unified, query.cursor);
  }

  let dbQuery = supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count,
       quoted_post_id, created_at,
       profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
    )
    .eq('status', 'published')
    .eq('region_id', query.regionId)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (query.district) dbQuery = dbQuery.eq('district', query.district);
  if (query.category !== 'all' && query.category !== 'following' && query.category !== 'general') {
    dbQuery = dbQuery.eq('category', query.category);
  }
  if (query.cursor) dbQuery = dbQuery.lt('created_at', query.cursor);

  const { data, error } = await dbQuery;

  const rows = (error || !data ? [] : data) as unknown as PostRow[];
  const postIds = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const quotedIds = rows.map((r) => r.quoted_post_id).filter((id): id is string => !!id);

  const [engagement, following, quotedPreviews, unifiedItems] = await Promise.all([
    fetchEngagementState(postIds, query.userId),
    fetchFollowingSet(query.userId, authorIds),
    fetchQuotedPreviews(quotedIds),
    query.category === 'all' && !query.cursor
      ? fetchUnifiedItems(query.regionId, 'all', query.district)
      : Promise.resolve([] as FeedItem[]),
  ]);

  let items = rows.map((row) =>
    mapPostToFeedItem(row, { ...engagement, following, quoted: quotedPreviews }),
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
    return { items: filterDemoItems(query), nextCursor: null };
  }

  return mergeAndSort(items, query.cursor);
}

async function fetchReelsPage(query: FeedQuery): Promise<{
  items: FeedItem[];
  nextCursor: string | null;
}> {
  let dbQuery = supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, view_count, created_at,
       profiles!reels_author_id_fkey (id, username, full_name, avatar_url, role, is_verified),
       videos (thumbnail_url, mux_playback_id)`,
    )
    .eq('status', 'published')
    .eq('region_id', query.regionId)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

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
    profiles: PostRow['profiles'];
    videos: { thumbnail_url: string | null; mux_playback_id: string | null } | { thumbnail_url: string | null; mux_playback_id: string | null }[] | null;
  };

  const rows = data as unknown as ReelRow[];

  const items: FeedItem[] = rows.map((row) => {
    const profile = unwrapProfile(row.profiles);
    const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
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
      mediaUrls: thumb ? [thumb] : [],
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
      isFollowing: false,
      quotedPost: null,
    };
  });

  const nextCursor =
    rows.length === FEED_PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function recordPostView(postId: string, viewerId: string | null): Promise<void> {
  if (postId.startsWith('demo-')) return;

  try {
    await supabase.from('post_views').insert({
      post_id: postId,
      viewer_id: viewerId,
      is_unique: true,
    });

    const { data } = await supabase.from('posts').select('view_count').eq('id', postId).maybeSingle();
    if (data) {
      await supabase
        .from('posts')
        .update({ view_count: (data.view_count ?? 0) + 1 })
        .eq('id', postId);
    }
  } catch {
    // Görüntüleme kaydı kritik değil
  }
}

export async function countNewPostsSince(
  regionId: string,
  since: string,
): Promise<number> {
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('region_id', regionId)
    .eq('status', 'published')
    .gt('created_at', since);

  return count ?? 0;
}
