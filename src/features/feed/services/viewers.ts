import type { FeedAuthor } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

export type PostViewer = {
  id: string;
  viewer: FeedAuthor;
  viewedAt: string;
  isFollower: boolean;
};

export type ViewerFilter = 'all' | 'followers' | 'recent';

export async function fetchPostViewers(
  postId: string,
  authorId: string,
  filter: ViewerFilter = 'recent',
): Promise<PostViewer[]> {
  if (postId.startsWith('demo-')) {
    return [
      {
        id: 'demo-v1',
        viewer: {
          id: 'demo-v-user-1',
          username: 'ahmet_k',
          fullName: 'Ahmet K.',
          avatarUrl: null,
          role: 'user',
          isVerified: false,
        },
        viewedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        isFollower: true,
      },
      {
        id: 'demo-v2',
        viewer: {
          id: 'demo-v-user-2',
          username: 'zeynep_t',
          fullName: 'Zeynep T.',
          avatarUrl: null,
          role: 'user',
          isVerified: false,
        },
        viewedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        isFollower: false,
      },
    ];
  }

  const { data: views } = await supabase
    .from('post_views')
    .select('id, viewer_id, created_at')
    .eq('post_id', postId)
    .not('viewer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const viewerIds = [...new Set((views ?? []).map((v) => v.viewer_id).filter(Boolean))] as string[];
  if (viewerIds.length === 0) return [];

  const [{ data: profiles }, { data: followers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, role, is_verified')
      .in('id', viewerIds),
    supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', authorId)
      .in('follower_id', viewerIds),
  ]);

  const followerSet = new Set((followers ?? []).map((f) => f.follower_id));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        role: p.role as UserRole,
        isVerified: p.is_verified,
      },
    ]),
  );

  let result: PostViewer[] = (views ?? [])
    .filter((v) => v.viewer_id && profileMap.has(v.viewer_id))
    .map((v) => ({
      id: v.id,
      viewer: profileMap.get(v.viewer_id!)!,
      viewedAt: v.created_at,
      isFollower: followerSet.has(v.viewer_id!),
    }));

  if (filter === 'followers') {
    result = result.filter((r) => r.isFollower);
  }

  return result;
}
