import { STORY_RING_PAGE_SIZE } from '@/features/stories/constants';
import type { StoryRing } from '@/features/stories/types';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { supabase } from '@/lib/supabase/client';

type StoryRow = {
  id: string;
  author_id: string;
  region_id: string | null;
  latest_item_at: string | null;
  latest_thumb_url: string | null;
  item_count: number | null;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    account_status: string;
  } | null;
};

export async function fetchStoryRingsFallback(options: {
  viewerId: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<{ rings: StoryRing[]; nextCursor: string | null }> {
  const { viewerId, cursor, limit = STORY_RING_PAGE_SIZE } = options;
  const now = new Date().toISOString();

  let query = supabase
    .from('stories')
    .select(
      'id, author_id, region_id, latest_item_at, latest_thumb_url, item_count, profiles!inner(username, full_name, avatar_url, is_verified, account_status)',
    )
    .eq('status', 'published')
    .gt('expires_at', now)
    .eq('audience', 'public')
    .eq('profiles.account_status', 'active')
    .gt('item_count', 0)
    .order('latest_item_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('latest_item_at', cursor);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    if (error) console.warn('[stories] fetchStoryRingsFallback failed:', error.message);
    return { rings: [], nextCursor: null };
  }

  const rows = data as StoryRow[];
  const pageRows = rows.slice(0, limit);
  const storyIds = pageRows.map((r) => r.id);

  const { data: itemRows } = await supabase
    .from('story_items')
    .select('id, story_id, created_at')
    .in('story_id', storyIds)
    .eq('status', 'published')
    .gt('expires_at', now);

  const itemsByStory = new Map<string, string[]>();
  for (const item of itemRows ?? []) {
    const list = itemsByStory.get(item.story_id as string) ?? [];
    list.push(item.id as string);
    itemsByStory.set(item.story_id as string, list);
  }

  let viewedItemIds = new Set<string>();
  if (viewerId && itemRows?.length) {
    const allItemIds = itemRows.map((r) => r.id as string);
    const { data: views } = await supabase
      .from('story_views')
      .select('story_item_id')
      .eq('viewer_id', viewerId)
      .in('story_item_id', allItemIds);
    viewedItemIds = new Set((views ?? []).map((v) => v.story_item_id as string));
  }

  const rings: StoryRing[] = pageRows
    .filter((row) => (itemsByStory.get(row.id)?.length ?? 0) > 0)
    .map((row) => {
      const profile = row.profiles;
      const storyItemIds = itemsByStory.get(row.id) ?? [];
      const hasUnseen =
        !viewerId || row.author_id === viewerId
          ? false
          : storyItemIds.some((id) => !viewedItemIds.has(id));

      return {
        userId: row.author_id,
        username: profile?.username ?? '',
        fullName: profile?.full_name ?? null,
        avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, 'active'),
        isVerified: profile?.is_verified ?? false,
        storyId: row.id,
        itemCount: storyItemIds.length || Number(row.item_count ?? 0),
        previewThumb: row.latest_thumb_url,
        latestItemAt: row.latest_item_at ?? now,
        hasUnseen,
        regionId: row.region_id,
      };
    });

  const nextCursor =
    rows.length > limit ? pageRows[pageRows.length - 1]?.latest_item_at ?? null : null;

  return { rings, nextCursor };
}
