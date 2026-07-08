import type { StoryNavigation } from '@/features/stories/types';
import { supabase } from '@/lib/supabase/client';

export async function recordStoryView(input: {
  viewerId: string;
  storyItemId: string;
  watchedSeconds: number;
  watchCompletion: number;
  navigation: StoryNavigation;
  exitedEarly?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('record_story_view', {
    p_viewer_id: input.viewerId,
    p_story_item_id: input.storyItemId,
    p_watched_seconds: input.watchedSeconds,
    p_watch_completion: input.watchCompletion,
    p_navigation: input.navigation,
    p_exited_early: input.exitedEarly ?? false,
  });

  if (error) {
    console.warn('[stories] recordStoryView failed:', error.message);
  }
}
