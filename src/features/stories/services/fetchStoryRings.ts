import { STORY_RING_PAGE_SIZE } from '@/features/stories/constants';
import type { StoryRing } from '@/features/stories/types';
import { fetchStoryRingsFallback } from '@/features/stories/services/fetchStoryRingsFallback';
import { getStorySeenMap, sortStoryRings } from '@/features/stories/services/storySeenCache';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { supabase } from '@/lib/supabase/client';

type RingRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  story_id: string;
  item_count: number;
  preview_thumb: string | null;
  latest_item_at: string;
  has_unseen: boolean;
  region_id: string | null;
};

function mapRing(row: RingRow): StoryRing {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: sanitizeAvatarUrl(row.avatar_url, 'active'),
    isVerified: row.is_verified ?? false,
    storyId: row.story_id,
    itemCount: Number(row.item_count ?? 0),
    previewThumb: row.preview_thumb,
    latestItemAt: row.latest_item_at,
    hasUnseen: row.has_unseen ?? false,
    regionId: row.region_id,
  };
}

export async function fetchStoryRings(options: {
  viewerId: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<{ rings: StoryRing[]; nextCursor: string | null }> {
  const { viewerId, cursor, limit = STORY_RING_PAGE_SIZE } = options;

  const { data, error } = await supabase.rpc('get_story_rings', {
    p_viewer_id: viewerId,
    p_cursor: cursor ?? null,
    p_limit: limit,
    p_region_id: null,
  });

  if (error) {
    console.warn('[stories] fetchStoryRings failed:', error.message);
    const fallback = await fetchStoryRingsFallback({ viewerId, cursor, limit });
    const seenAt = await getStorySeenMap();
    return { rings: sortStoryRings(fallback.rings, seenAt, viewerId), nextCursor: fallback.nextCursor };
  }

  const rows = (data ?? []) as RingRow[];
  if (rows.length === 0) {
    const fallback = await fetchStoryRingsFallback({ viewerId, cursor, limit });
    if (fallback.rings.length === 0) return { rings: [], nextCursor: null };
    const seenAt = await getStorySeenMap();
    return { rings: sortStoryRings(fallback.rings, seenAt, viewerId), nextCursor: fallback.nextCursor };
  }
  const rings = rows.map(mapRing);
  const seenAt = await getStorySeenMap();
  const sorted = sortStoryRings(rings, seenAt, viewerId);

  const nextCursor =
    rows.length >= limit ? rows[rows.length - 1]?.latest_item_at ?? null : null;

  return { rings: sorted, nextCursor };
}
