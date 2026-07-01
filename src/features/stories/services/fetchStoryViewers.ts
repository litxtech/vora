import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import { supabase } from '@/lib/supabase/client';

export type StoryViewerRow = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  watchedSeconds: number;
  watchCompletion: number;
  viewedAt: string;
};

function mapViewerRow(row: Record<string, unknown>): StoryViewerRow {
  return {
    userId: String(row.userId ?? ''),
    username: String(row.username ?? ''),
    fullName: (row.fullName as string | null) ?? null,
    avatarUrl: sanitizeAvatarUrl((row.avatarUrl as string | null) ?? null, 'active'),
    watchedSeconds: Number(row.watchedSeconds ?? 0),
    watchCompletion: Number(row.watchCompletion ?? 0),
    viewedAt: String(row.viewedAt ?? ''),
  };
}

async function fetchStoryItemViewersFallback(storyItemId: string): Promise<StoryViewerRow[]> {
  const { data, error } = await supabase
    .from('story_views')
    .select(
      'viewer_id, watched_seconds, watch_completion, viewed_at, profiles!inner(username, full_name, avatar_url, account_status)',
    )
    .eq('story_item_id', storyItemId)
    .order('viewed_at', { ascending: false })
    .limit(80);

  if (error || !data?.length) return [];

  return data.map((row) =>
    mapViewerRow({
      userId: row.viewer_id,
      username: (row.profiles as { username?: string })?.username ?? '',
      fullName: (row.profiles as { full_name?: string | null })?.full_name ?? null,
      avatarUrl: (row.profiles as { avatar_url?: string | null })?.avatar_url ?? null,
      watchedSeconds: row.watched_seconds,
      watchCompletion: row.watch_completion,
      viewedAt: row.viewed_at,
    }),
  );
}

export async function fetchStoryItemViewers(
  authorId: string,
  storyItemId: string,
): Promise<StoryViewerRow[]> {
  const { data, error } = await supabase.rpc('get_story_item_viewers', {
    p_author_id: authorId,
    p_story_item_id: storyItemId,
    p_limit: 80,
  });

  if (error) {
    console.warn('[stories] fetchStoryItemViewers failed:', error.message);
    return fetchStoryItemViewersFallback(storyItemId);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => mapViewerRow(row as Record<string, unknown>));
}
