import { DEMO_REELS } from '@/features/reels/constants';
import type { ReelItem } from '@/features/reels/types';
import type { FeedAuthor } from '@/features/feed/types';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const PAGE_SIZE = 10;

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.is_verified ?? false,
  };
}

export async function fetchReels(
  regionId: string,
  userId: string | null,
  cursor: string | null,
): Promise<{ items: ReelItem[]; nextCursor: string | null }> {
  let query = supabase
    .from('reels')
    .select(
      `id, author_id, region_id, caption, like_count, view_count, created_at,
       profiles!reels_author_id_fkey (id, username, full_name, avatar_url, role, is_verified),
       videos (mux_playback_id, thumbnail_url, status)`,
    )
    .eq('status', 'published')
    .eq('region_id', regionId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error || !data?.length) {
    return { items: DEMO_REELS, nextCursor: null };
  }

  type ReelRow = {
    id: string;
    author_id: string;
    region_id: string;
    caption: string | null;
    like_count: number;
    view_count: number;
    created_at: string;
    profiles: ProfileRow | ProfileRow[] | null;
    videos: { mux_playback_id: string | null; thumbnail_url: string | null; status: string } | { mux_playback_id: string | null; thumbnail_url: string | null; status: string }[] | null;
  };

  const rows = data as unknown as ReelRow[];
  const reelIds = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];

  const [likedRes, followingRes] = await Promise.all([
    userId
      ? supabase.from('reel_likes').select('reel_id').eq('user_id', userId).in('reel_id', reelIds)
      : Promise.resolve({ data: [] as { reel_id: string }[] }),
    userId
      ? supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);

  const liked = new Set((likedRes.data ?? []).map((r) => r.reel_id));
  const following = new Set((followingRes.data ?? []).map((r) => r.following_id));

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
      commentCount: 0,
      createdAt: row.created_at,
      isLiked: liked.has(row.id),
      isFollowing: following.has(row.author_id),
    });
  }

  if (items.length === 0) return { items: DEMO_REELS, nextCursor: null };

  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function recordReelView(reelId: string): Promise<void> {
  if (reelId.startsWith('demo-')) return;
  const { data } = await supabase.from('reels').select('view_count').eq('id', reelId).maybeSingle();
  if (data) {
    await supabase.from('reels').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', reelId);
  }
}
