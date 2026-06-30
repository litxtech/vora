import type { LikeUser } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const DEFAULT_LIMIT = 50;

type LikeRow = {
  user_id: string;
  created_at: string;
};

async function mapLikers(
  rows: LikeRow[],
  viewerId: string | null,
): Promise<LikeUser[]> {
  const userIds = rows.map((r) => r.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, is_verified, hidden_badges')
    .in('id', userIds);

  if (!profiles?.length) return [];

  let followingSet = new Set<string>();
  if (viewerId) {
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', userIds);
    followingSet = new Set((myFollows ?? []).map((f) => f.following_id));
  }

  const profileById = new Map(
    profiles.map((p) => [
      p.id,
      {
        id: p.id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role as UserRole,
        isVerified: p.is_verified,
        hiddenBadges: (p as { hidden_badges?: string[] | null }).hidden_badges ?? [],
        isFollowing: followingSet.has(p.id),
      },
    ]),
  );

  return rows
    .map((row) => {
      const profile = profileById.get(row.user_id);
      if (!profile) return null;
      return { ...profile, likedAt: row.created_at };
    })
    .filter(Boolean) as LikeUser[];
}

export async function fetchPostLikers(
  postId: string,
  viewerId: string | null,
  limit = DEFAULT_LIMIT,
): Promise<LikeUser[]> {
  if (postId.startsWith('demo-')) return [];

  const { data } = await supabase
    .from('post_likes')
    .select('user_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return mapLikers((data ?? []) as LikeRow[], viewerId);
}

export async function fetchReelLikers(
  reelId: string,
  viewerId: string | null,
  limit = DEFAULT_LIMIT,
): Promise<LikeUser[]> {
  if (reelId.startsWith('demo-')) return [];

  const { data } = await supabase
    .from('reel_likes')
    .select('user_id, created_at')
    .eq('reel_id', reelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return mapLikers((data ?? []) as LikeRow[], viewerId);
}
