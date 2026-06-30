import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function requestAccountDeletionRpc(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('request_account_deletion');
  return { error: supabaseErrorMessage(error) };
}

export async function requestAccountFreezeRpc(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('request_account_freeze');
  return { error: supabaseErrorMessage(error) };
}

export async function cancelAccountDeletionRpc(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_account_deletion');
  return { error: supabaseErrorMessage(error) };
}

export async function adminDeleteUserAccount(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_user_account', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
