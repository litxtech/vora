import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function deleteStoryItem(input: {
  authorId: string;
  storyItemId: string;
  storyId: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('story_items')
    .update({ status: 'removed' })
    .eq('id', input.storyItemId)
    .eq('author_id', input.authorId);

  if (error) {
    return { error: supabaseErrorMessage(error) };
  }

  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('item_count')
    .eq('id', input.storyId)
    .eq('author_id', input.authorId)
    .maybeSingle();

  if (storyError) {
    return { error: supabaseErrorMessage(storyError) };
  }

  if ((story?.item_count ?? 0) === 0) {
    const { error: archiveError } = await supabase
      .from('stories')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', input.storyId)
      .eq('author_id', input.authorId);

    if (archiveError) {
      return { error: supabaseErrorMessage(archiveError) };
    }
  }

  return { error: null };
}
