import {
  listPinnedPosts,
  pinPost,
  unpinPost,
  updatePostPin,
  type PinnedPostRow,
} from '@/features/feed/services/postPinning';
import { supabase } from '@/lib/supabase/client';

export type { PinnedPostRow };

export type AdminUserPostRow = {
  id: string;
  title: string | null;
  content: string;
  category: string;
  media_urls: string[];
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  pinned_until: string | null;
};

export async function fetchPinnedPostsAdmin(limit = 50) {
  return listPinnedPosts(limit);
}

export async function fetchUserPostsAdmin(authorId: string, limit = 30): Promise<AdminUserPostRow[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, category, media_urls, created_at, view_count, like_count, comment_count, is_pinned, pinned_until',
    )
    .eq('author_id', authorId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    content: (row.content as string) ?? '',
    category: (row.category as string) ?? 'general',
    media_urls: (row.media_urls as string[] | null) ?? [],
    created_at: row.created_at as string,
    view_count: (row.view_count as number) ?? 0,
    like_count: (row.like_count as number) ?? 0,
    comment_count: (row.comment_count as number) ?? 0,
    is_pinned: Boolean(row.is_pinned),
    pinned_until: (row.pinned_until as string | null) ?? null,
  }));
}

export async function adminPinPost(postId: string, days: number | null, priority = 0) {
  return pinPost(postId, days, priority);
}

export async function adminUnpinPost(postId: string) {
  return unpinPost(postId);
}

export async function adminUpdatePostPin(postId: string, days: number | null, priority?: number) {
  return updatePostPin(postId, days, priority);
}
