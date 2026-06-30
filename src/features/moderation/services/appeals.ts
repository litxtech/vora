import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AppealType = 'ban' | 'content_removal' | 'account_suspension' | 'other';

export async function submitModerationAppeal(
  appealType: AppealType,
  reason: string,
  referenceId?: string,
  referenceType?: string,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum gerekli' };

  const { error } = await supabase.from('moderation_appeals').insert({
    user_id: user.id,
    appeal_type: appealType,
    reason: reason.trim(),
    reference_id: referenceId ?? null,
    reference_type: referenceType ?? null,
  });

  return { error: supabaseErrorMessage(error) };
}
