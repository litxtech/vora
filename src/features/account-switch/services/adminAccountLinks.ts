import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminAccountLinkRequestRow = {
  id: string;
  requester_id: string;
  requester_username: string;
  target_user_id: string;
  target_username: string;
  status: string;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
};

export type AdminLinkedAccountRow = {
  id: string;
  personal_user_id: string;
  personal_username: string;
  business_user_id: string;
  business_username: string;
  linked_by: string;
  linked_at: string;
};

export async function fetchAdminAccountLinkRequests(
  status = 'all',
  limit = 50,
): Promise<AdminAccountLinkRequestRow[]> {
  const { data, error } = await supabase.rpc('admin_list_account_link_requests', {
    p_status: status,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminAccountLinkRequestRow[];
}

export async function fetchAdminLinkedAccounts(limit = 50): Promise<AdminLinkedAccountRow[]> {
  const { data, error } = await supabase.rpc('admin_list_linked_accounts', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminLinkedAccountRow[];
}

export async function adminCancelAccountLinkRequest(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_account_link_request', { p_request_id: requestId });
  return { error: supabaseErrorMessage(error) };
}

export async function adminForceUnlinkAccounts(linkId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_force_unlink_accounts', { p_link_id: linkId });
  return { error: supabaseErrorMessage(error) };
}
