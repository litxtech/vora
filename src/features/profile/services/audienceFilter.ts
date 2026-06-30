import { fetchMutualFriendIds } from '@/features/profile/services/mutualFriends';
import { supabase } from '@/lib/supabase/client';

export type PostAudience = 'public' | 'friends' | 'close_friends';

type PostWithAudience = {
  id: string;
  authorId: string;
  audience: PostAudience;
};

export async function fetchViewerContext(viewerId: string | null): Promise<{
  friendIds: Set<string>;
  closeFriendAuthorIds: Set<string>;
}> {
  const friendIds = new Set<string>();
  const closeFriendAuthorIds = new Set<string>();

  if (!viewerId) return { friendIds, closeFriendAuthorIds };

  const [friendIdsList, closeRes] = await Promise.all([
    fetchMutualFriendIds(viewerId),
    supabase.from('close_friends').select('user_id').eq('friend_id', viewerId),
  ]);

  for (const friendId of friendIdsList) {
    friendIds.add(friendId);
  }
  for (const cf of closeRes.data ?? []) {
    closeFriendAuthorIds.add(cf.user_id);
  }

  return { friendIds, closeFriendAuthorIds };
}

export function canViewPostAudience(
  post: PostWithAudience,
  viewerId: string | null,
  context: { friendIds: Set<string>; closeFriendAuthorIds: Set<string> },
): boolean {
  if (post.authorId === viewerId) return true;
  if (!viewerId) return post.audience === 'public';

  switch (post.audience) {
    case 'public':
      return true;
    case 'friends':
      return context.friendIds.has(post.authorId);
    case 'close_friends':
      return context.closeFriendAuthorIds.has(post.authorId);
    default:
      return false;
  }
}

export async function filterPostsByAudience<T extends PostWithAudience>(
  posts: T[],
  viewerId: string | null,
): Promise<T[]> {
  if (posts.length === 0) return posts;
  const context = await fetchViewerContext(viewerId);
  return posts.filter((p) => canViewPostAudience(p, viewerId, context));
}

export async function attachAudienceToPosts<T extends { id: string; author_id?: string; authorId?: string }>(
  rows: T[],
): Promise<(T & { audience: PostAudience })[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data } = await supabase.from('posts').select('id, author_id, audience').in('id', ids);
  const byId = new Map((data ?? []).map((p) => [p.id, p.audience as PostAudience]));

  return rows.map((r) => ({
    ...r,
    audience: byId.get(r.id) ?? 'public',
    authorId: r.authorId ?? r.author_id ?? '',
  }));
}
