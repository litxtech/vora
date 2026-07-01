import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import type { StoryBundle, StoryItem } from '@/features/stories/types';
import { supabase } from '@/lib/supabase/client';

type StoryRow = {
  id: string;
  author_id: string;
};

type ItemRow = {
  id: string;
  story_id: string;
  author_id: string;
  sort_order: number;
  media_type: 'image' | 'video';
  media_url: string;
  thumb_url: string | null;
  duration_sec: number | null;
  sticker_category: string | null;
  created_at: string;
};

export async function fetchStoryBundleFallback(
  viewerId: string | null,
  authorId: string,
): Promise<StoryBundle | null> {
  const now = new Date().toISOString();

  const { data: storyRow } = await supabase
    .from('stories')
    .select('id, author_id')
    .eq('author_id', authorId)
    .eq('status', 'published')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!storyRow) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_verified, account_status')
    .eq('id', authorId)
    .maybeSingle();

  if (!profile || profile.account_status !== 'active') return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from('story_items')
    .select(
      'id, story_id, author_id, sort_order, media_type, media_url, thumb_url, duration_sec, sticker_category, created_at',
    )
    .eq('story_id', storyRow.id)
    .eq('status', 'published')
    .gt('expires_at', now)
    .order('sort_order', { ascending: true });

  if (itemsError || !itemRows?.length) return null;

  let reactedIds = new Set<string>();
  if (viewerId) {
    const { data: reactions } = await supabase
      .from('story_reactions')
      .select('story_item_id')
      .eq('user_id', viewerId)
      .in(
        'story_item_id',
        itemRows.map((r) => r.id),
      );
    reactedIds = new Set((reactions ?? []).map((r) => r.story_item_id as string));
  }

  const items: StoryItem[] = (itemRows as ItemRow[]).map((row) => ({
    id: row.id,
    storyId: row.story_id,
    authorId: row.author_id,
    sortOrder: row.sort_order,
    mediaType: row.media_type,
    mediaUrl: resolveStoryMediaUrl(row.media_url) ?? row.media_url,
    thumbUrl: resolveStoryThumbUrl(row.thumb_url, row.media_url),
    durationSec: row.duration_sec != null ? Number(row.duration_sec) : null,
    stickerCategory: (row.sticker_category as StoryItem['stickerCategory']) ?? null,
    createdAt: row.created_at,
    hasReacted: reactedIds.has(row.id),
  }));

  return {
    storyId: (storyRow as StoryRow).id,
    authorId,
    username: profile.username ?? '',
    fullName: profile.full_name,
    avatarUrl: sanitizeAvatarUrl(profile.avatar_url, profile.account_status ?? 'active'),
    isVerified: profile.is_verified ?? false,
    items,
  };
}
