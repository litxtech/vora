import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function ensureCurrentUserProfile(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('ensure_current_user_profile');
  return { error: supabaseErrorMessage(error) };
}
