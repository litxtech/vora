import type { StoryBundle, StoryItem } from '@/features/stories/types';
import { supabase } from '@/lib/supabase/client';

type BundleRow = {
  story_id: string;
  author_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  item_id: string;
  sort_order: number;
  media_type: 'image' | 'video';
  media_url: string;
  thumb_url: string | null;
  duration_sec: number | null;
  sticker_category: string | null;
  created_at: string;
  has_reacted: boolean;
};

export async function fetchStoryBundle(
  viewerId: string | null,
  authorId: string,
): Promise<StoryBundle | null> {
  const { data, error } = await supabase.rpc('get_story_bundle', {
    p_viewer_id: viewerId,
    p_author_id: authorId,
  });

  if (error) {
    console.warn('[stories] fetchStoryBundle failed:', error.message);
    return null;
  }

  const rows = (data ?? []) as BundleRow[];
  if (rows.length === 0) return null;

  const head = rows[0];
  const items: StoryItem[] = rows.map((row) => ({
    id: row.item_id,
    storyId: row.story_id,
    authorId: row.author_id,
    sortOrder: row.sort_order,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    thumbUrl: row.thumb_url,
    durationSec: row.duration_sec != null ? Number(row.duration_sec) : null,
    stickerCategory: (row.sticker_category as StoryItem['stickerCategory']) ?? null,
    createdAt: row.created_at,
    hasReacted: row.has_reacted ?? false,
  }));

  return {
    storyId: head.story_id,
    authorId: head.author_id,
    username: head.username,
    fullName: head.full_name,
    avatarUrl: head.avatar_url,
    isVerified: head.is_verified ?? false,
    items,
  };
}
