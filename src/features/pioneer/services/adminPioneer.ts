import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function grantPioneer(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_pioneer', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function revokePioneer(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_pioneer', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
