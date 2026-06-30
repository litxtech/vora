import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type LobbyDeveloperFeedbackInput = {
  fullName: string;
  message: string;
  phone?: string;
  email?: string;
};

export async function submitLobbyDeveloperFeedback(
  input: LobbyDeveloperFeedbackInput,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_lobby_developer_feedback', {
    p_full_name: input.fullName.trim(),
    p_message: input.message.trim(),
    p_phone: input.phone?.trim() || null,
    p_email: input.email?.trim() || null,
  });

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  return { id: data as string, error: null };
}
