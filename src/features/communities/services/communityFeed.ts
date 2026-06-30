import { COMMUNITY_FEED_PAGE_SIZE } from '@/features/communities/constants';
import type { CommunityFeedItem, CommunityFeedScope } from '@/features/communities/types';
import type { FeedAuthor, FeedCategory, FeedItem } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  hidden_badges?: string[] | null;
};

type CommunityRow = {
  id: string;
  name: string;
  icon_url: string | null;
  is_suspended?: boolean;
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
  created_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
  communities: CommunityRow | CommunityRow[] | null;
};

function unwrapProfile(profiles: PostRow['profiles']): ProfileRow | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

function unwrapCommunity(communities: PostRow['communities']): CommunityRow | null {
  if (!communities) return null;
  return Array.isArray(communities) ? communities[0] ?? null : communities;
}

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.is_verified ?? false,
    hiddenBadges: profile?.hidden_badges ?? [],
  };
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

async function fetchMyCommunityIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId);

  return (data ?? []).map((row) => row.community_id);
}

function mapPostToFeedItem(
  row: PostRow,
  community: CommunityRow,
  state: { liked: Set<string>; saved: Set<string> },
): CommunityFeedItem {
  const base: FeedItem = {
    id: `post-${row.id}`,
    sourceType: 'post',
    sourceId: row.id,
    author: toAuthor(unwrapProfile(row.profiles), row.author_id),
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
    isFollowing: false,
    quotedPost: null,
  };

  return {
    ...base,
    community: {
      id: community.id,
      name: community.name,
      iconUrl: community.icon_url,
    },
  };
}

export async function fetchCommunityFeedPage(options: {
  userId: string | null;
  regionId?: string | null;
  cursor?: string | null;
  scope?: CommunityFeedScope;
}): Promise<{ items: CommunityFeedItem[]; nextCursor: string | null }> {
  const scope = options.scope ?? 'all';

  if (scope === 'mine') {
    if (!options.userId) return { items: [], nextCursor: null };
    const communityIds = await fetchMyCommunityIds(options.userId);
    if (communityIds.length === 0) return { items: [], nextCursor: null };

    let query = supabase
      .from('posts')
      .select(
        `id, author_id, region_id, title, content, media_urls, category, district, location_label,
         latitude, longitude, like_count, comment_count, quote_count, save_count, view_count, created_at,
         profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified, hidden_badges),
         communities!posts_community_id_fkey (id, name, icon_url, is_suspended)`,
      )
      .in('community_id', communityIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(COMMUNITY_FEED_PAGE_SIZE);

    if (options.cursor) query = query.lt('created_at', options.cursor);
    if (options.regionId) query = query.eq('region_id', options.regionId);

    const { data } = await query;
    return mapFeedRows((data ?? []) as unknown as PostRow[], options.userId);
  }

  let query = supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count, created_at,
       profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified, hidden_badges),
       communities!posts_community_id_fkey (id, name, icon_url, is_suspended)`,
    )
    .not('community_id', 'is', null)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(COMMUNITY_FEED_PAGE_SIZE);

  if (options.cursor) query = query.lt('created_at', options.cursor);
  if (options.regionId) query = query.eq('region_id', options.regionId);

  const { data } = await query;
  return mapFeedRows((data ?? []) as unknown as PostRow[], options.userId);
}

async function mapFeedRows(
  rows: PostRow[],
  viewerId: string | null,
): Promise<{ items: CommunityFeedItem[]; nextCursor: string | null }> {
  const visibleRows = rows.filter((row) => {
    const community = unwrapCommunity(row.communities);
    return community && !community.is_suspended;
  });

  const postIds = visibleRows.map((row) => row.id);
  const state = await fetchEngagementState(postIds, viewerId);

  const items = visibleRows
    .map((row) => {
      const community = unwrapCommunity(row.communities);
      if (!community) return null;
      return mapPostToFeedItem(row, community, state);
    })
    .filter((item): item is CommunityFeedItem => item !== null);

  const nextCursor =
    visibleRows.length >= COMMUNITY_FEED_PAGE_SIZE
      ? visibleRows[visibleRows.length - 1].created_at
      : null;

  return { items, nextCursor };
}
