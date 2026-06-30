import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function grantPlatformCharm(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_platform_charm', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function revokePlatformCharm(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_platform_charm', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
