import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type DeleteStoryItemResult = {
  ok?: boolean;
  error?: string;
  story_id?: string;
  remaining?: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Oturum açmanız gerekiyor.',
  not_found: 'Hikaye karesi bulunamadı.',
  forbidden: 'Bu işlem için yetkiniz yok.',
};

export async function deleteStoryItem(storyItemId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('delete_story_item', {
    p_story_item_id: storyItemId,
  });

  if (error) {
    return { error: supabaseErrorMessage(error) };
  }

  const payload = (data ?? null) as DeleteStoryItemResult | null;
  if (!payload?.ok) {
    const code = payload?.error ?? 'unknown';
    return { error: ERROR_MESSAGES[code] ?? 'Hikaye silinemedi.' };
  }

  return { error: null };
}
