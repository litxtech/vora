import type { FeedAuthor } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

export type ReelViewer = {
  id: string;
  viewer: FeedAuthor;
  viewedAt: string;
  isFollower: boolean;
};

export type ReelViewerFilter = 'all' | 'followers' | 'recent';

export async function fetchReelViewers(
  reelId: string,
  authorId: string,
  filter: ReelViewerFilter = 'recent',
  asAdmin = false,
): Promise<ReelViewer[]> {
  if (asAdmin) {
    const { data, error } = await supabase.rpc('admin_list_reel_viewers', {
      p_reel_id: reelId,
      p_limit: 200,
    });
    if (error || !data) return [];

    let result: ReelViewer[] = data.map((row) => ({
      id: row.view_id,
      viewer: {
        id: row.viewer_id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        role: row.role as UserRole,
        isVerified: row.is_verified,
      },
      viewedAt: row.viewed_at,
      isFollower: row.is_follower,
    }));

    if (filter === 'followers') {
      result = result.filter((row) => row.isFollower);
    }

    return result;
  }

  const { data: views } = await supabase
    .from('reel_views')
    .select('viewer_id, created_at')
    .eq('reel_id', reelId)
    .order('created_at', { ascending: false })
    .limit(100);

  const viewerIds = [...new Set((views ?? []).map((view) => view.viewer_id).filter(Boolean))];
  if (viewerIds.length === 0) return [];

  const [{ data: profiles }, { data: followers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role, is_verified')
      .in('id', viewerIds),
    supabase.from('follows').select('follower_id').eq('following_id', authorId).in('follower_id', viewerIds),
  ]);

  const followerSet = new Set((followers ?? []).map((row) => row.follower_id));
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        username: profile.username,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        role: profile.role as UserRole,
        isVerified: profile.is_verified,
      },
    ]),
  );

  let result: ReelViewer[] = (views ?? [])
    .filter((view) => profileMap.has(view.viewer_id))
    .map((view) => ({
      id: view.viewer_id,
      viewer: profileMap.get(view.viewer_id)!,
      viewedAt: view.created_at,
      isFollower: followerSet.has(view.viewer_id),
    }));

  if (filter === 'followers') {
    result = result.filter((row) => row.isFollower);
  }

  return result;
}
