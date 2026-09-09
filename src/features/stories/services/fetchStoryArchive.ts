import type { StoryArchiveItem } from '@/features/stories/types';
import { STORY_ARCHIVE_PAGE_SIZE } from '@/features/stories/constants';
import { resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ArchiveRow = {
  item_id: string;
  story_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumb_url: string | null;
  duration_sec: number | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  view_count: number;
};

function mapArchiveRow(row: ArchiveRow): StoryArchiveItem {
  return {
    id: row.item_id,
    storyId: row.story_id,
    mediaType: row.media_type,
    mediaUrl: resolveStoryMediaUrl(row.media_url) ?? row.media_url,
    thumbUrl: resolveStoryThumbUrl(row.thumb_url, row.media_url),
    durationSec: row.duration_sec != null ? Number(row.duration_sec) : null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isActive: row.is_active ?? false,
    viewCount: row.view_count ?? 0,
  };
}

export type FetchStoryArchiveResult = {
  items: StoryArchiveItem[];
  error: string | null;
  hasMore: boolean;
};

export async function fetchStoryArchivePage(
  cursor: string | null,
  limit = STORY_ARCHIVE_PAGE_SIZE,
): Promise<FetchStoryArchiveResult> {
  const { data, error } = await supabase.rpc('get_story_archive', {
    p_cursor: cursor,
    p_limit: limit,
  });

  if (error) {
    return {
      items: [],
      error: supabaseErrorMessage(error) ?? 'Hikâye arşivi yüklenemedi.',
      hasMore: false,
    };
  }

  const rows = (data ?? []) as ArchiveRow[];
  const items = rows.map(mapArchiveRow);

  return {
    items,
    error: null,
    hasMore: rows.length >= limit,
  };
}
