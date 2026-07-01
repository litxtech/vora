import { STORY_RING_PAGE_SIZE } from '@/features/stories/constants';
import type { StoryRing } from '@/features/stories/types';
import { getStorySeenMap, sortStoryRings } from '@/features/stories/services/storySeenCache';
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
    avatarUrl: row.avatar_url,
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
  regionId?: string | null;
  limit?: number;
}): Promise<{ rings: StoryRing[]; nextCursor: string | null }> {
  const { viewerId, cursor, regionId, limit = STORY_RING_PAGE_SIZE } = options;

  const { data, error } = await supabase.rpc('get_story_rings', {
    p_viewer_id: viewerId,
    p_cursor: cursor ?? null,
    p_limit: limit,
    p_region_id: regionId ?? null,
  });

  if (error) {
    console.warn('[stories] fetchStoryRings failed:', error.message);
    return { rings: [], nextCursor: null };
  }

  const rows = (data ?? []) as RingRow[];
  const rings = rows.map(mapRing);
  const seenAt = await getStorySeenMap();
  const sorted = sortStoryRings(rings, seenAt, viewerId);

  const nextCursor =
    rows.length >= limit ? rows[rows.length - 1]?.latest_item_at ?? null : null;

  return { rings: sorted, nextCursor };
}
