import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function toggleStoryReaction(
  storyItemId: string,
  userId: string,
  hasReacted: boolean,
  emoji = '❤️',
): Promise<{ hasReacted: boolean; error: string | null }> {
  if (hasReacted) {
    const { error } = await supabase
      .from('story_reactions')
      .delete()
      .eq('story_item_id', storyItemId)
      .eq('user_id', userId);
    return { hasReacted: false, error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('story_reactions').upsert(
    { story_item_id: storyItemId, user_id: userId, emoji },
    { onConflict: 'story_item_id,user_id' },
  );

  return { hasReacted: !error, error: supabaseErrorMessage(error) };
}
