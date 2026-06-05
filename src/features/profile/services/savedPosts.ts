import type { FeedItem } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';

export type SaveCollection = {
  id: string;
  name: string;
  postCount: number;
};

export async function fetchSaveCollections(userId: string): Promise<SaveCollection[]> {
  const { data } = await supabase
    .from('save_collections')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((c) => ({ id: c.id, name: c.name, postCount: 0 }));
}

export async function fetchSavedPosts(userId: string): Promise<FeedItem[]> {
  const { data: saves } = await supabase
    .from('post_saves')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const postIds = (saves ?? []).map((s) => s.post_id);
  if (postIds.length === 0) return [];

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `id, author_id, region_id, title, content, media_urls, category, district, location_label,
       latitude, longitude, like_count, comment_count, quote_count, save_count, view_count, created_at,
       profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
    )
    .in('id', postIds)
    .eq('status', 'published');

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
    profiles: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string;
      is_verified: boolean;
    } | { id: string; username: string; full_name: string | null; avatar_url: string | null; role: string; is_verified: boolean }[] | null;
  };

  return ((posts ?? []) as unknown as PostRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: `post-${row.id}`,
      sourceType: 'post' as const,
      sourceId: row.id,
      author: {
        id: profile?.id ?? row.author_id,
        username: profile?.username ?? 'kullanici',
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role: (profile?.role ?? 'user') as FeedItem['author']['role'],
        isVerified: profile?.is_verified ?? false,
      },
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
      isSaved: true,
      isFollowing: false,
      quotedPost: null,
    };
  });
}

export async function createCollection(
  userId: string,
  name: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('save_collections').insert({ user_id: userId, name });
  return { error: error?.message ?? null };
}
