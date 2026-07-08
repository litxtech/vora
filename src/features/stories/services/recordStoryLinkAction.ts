import type { StoryLinkAction } from '@/features/stories/types';
import { supabase } from '@/lib/supabase/client';

export async function recordStoryLinkAction(input: {
  viewerId: string;
  storyItemId: string;
  linkId: string;
  action: StoryLinkAction;
}): Promise<void> {
  const { error } = await supabase.rpc('record_story_link_action', {
    p_viewer_id: input.viewerId,
    p_story_item_id: input.storyItemId,
    p_link_id: input.linkId,
    p_action: input.action,
  });

  if (error) {
    console.warn('[stories] recordStoryLinkAction failed:', error.message);
  }
}
