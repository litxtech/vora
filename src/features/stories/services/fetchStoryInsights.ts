import type { StoryInsights, StoryItemInsight, StoryLinkStat } from '@/features/stories/types';
import { resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import { supabase } from '@/lib/supabase/client';

type InsightRow = {
  story_id: string;
  total_views: number;
  unique_viewers: number;
  item_id: string;
  sort_order: number;
  thumb_url: string | null;
  media_type: 'image' | 'video';
  item_views: number;
  avg_watched_seconds: number;
  avg_completion: number;
  tap_forward_count: number;
  tap_back_count: number;
  swipe_forward_count: number;
  swipe_back_count: number;
  auto_forward_count: number;
  exited_early_count: number;
  link_tap_count: number;
  link_swipe_up_count: number;
  link_stats: Array<{
    link_id: string;
    tap_count: number;
    swipe_up_count: number;
  }> | null;
};

export async function fetchStoryInsights(
  authorId: string,
  storyId: string,
): Promise<StoryInsights | null> {
  const { data, error } = await supabase.rpc('get_story_insights' as never, {
    p_author_id: authorId,
    p_story_id: storyId,
  } as never);

  if (error) {
    console.warn('[stories] fetchStoryInsights failed:', error.message);
    return null;
  }

  const rows = (data ?? []) as InsightRow[];
  if (rows.length === 0) return null;

  const head = rows[0];
  const items: StoryItemInsight[] = rows.map((row) => {
    const linkStats: StoryLinkStat[] = (row.link_stats ?? []).map((stat) => ({
      linkId: stat.link_id,
      tapCount: Number(stat.tap_count ?? 0),
      swipeUpCount: Number(stat.swipe_up_count ?? 0),
    }));

    return {
      itemId: row.item_id,
      sortOrder: row.sort_order,
      thumbUrl: resolveStoryThumbUrl(row.thumb_url, null),
      mediaType: row.media_type,
      itemViews: Number(row.item_views ?? 0),
      avgWatchedSeconds: Number(row.avg_watched_seconds ?? 0),
      avgCompletion: Number(row.avg_completion ?? 0),
      tapForwardCount: Number(row.tap_forward_count ?? 0),
      tapBackCount: Number(row.tap_back_count ?? 0),
      swipeForwardCount: Number(row.swipe_forward_count ?? 0),
      swipeBackCount: Number(row.swipe_back_count ?? 0),
      autoForwardCount: Number(row.auto_forward_count ?? 0),
      exitedEarlyCount: Number(row.exited_early_count ?? 0),
      linkTapCount: Number(row.link_tap_count ?? 0),
      linkSwipeUpCount: Number(row.link_swipe_up_count ?? 0),
      linkStats,
    };
  });

  return {
    storyId: head.story_id,
    totalViews: Number(head.total_views ?? 0),
    uniqueViewers: Number(head.unique_viewers ?? 0),
    items,
  };
}
