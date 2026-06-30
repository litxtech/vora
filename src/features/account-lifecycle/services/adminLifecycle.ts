import type {
  AccountLifecycleAccountRow,
  AccountLifecycleRequestRow,
  AccountLifecycleStats,
} from '@/features/account-lifecycle/types';
import type { LifecycleStatFilter } from '@/features/account-lifecycle/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const LIFECYCLE_ACCOUNT_COLUMNS =
  'id, username, full_name, avatar_url, account_status, created_at, deletion_requested_at, deleted_at, last_seen_at';

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function fetchAccountLifecycleStats(): Promise<{
  data: AccountLifecycleStats | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_account_lifecycle_stats');
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: data as AccountLifecycleStats, error: null };
}

export async function fetchAccountLifecycleRequests(
  status: 'pending' | 'all' = 'pending',
): Promise<{ data: AccountLifecycleRequestRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_account_lifecycle_requests', {
    p_status: status,
    p_limit: 50,
  });

  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data ?? []) as AccountLifecycleRequestRow[], error: null };
}

export async function fetchLifecycleAccountsByStat(
  filter: LifecycleStatFilter,
  limit = 50,
): Promise<{ data: AccountLifecycleAccountRow[]; error: string | null }> {
  let query = supabase
    .from('profiles')
    .select(LIFECYCLE_ACCOUNT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  switch (filter) {
    case 'active_accounts':
      query = query.eq('account_status', 'active');
      break;
    case 'frozen_accounts':
      query = query.eq('account_status', 'frozen');
      break;
    case 'deletion_pending_accounts':
      query = query.eq('account_status', 'deletion_pending');
      break;
    case 'deleted_accounts':
      query = query.eq('account_status', 'deleted');
      break;
    case 'opened_today': {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
      break;
    }
    case 'opened_this_month':
      query = query.gte('created_at', startOfMonthIso());
      break;
    case 'deleted_this_month':
      query = query.eq('account_status', 'deleted').gte('deleted_at', startOfMonthIso());
      break;
    case 'total_accounts':
      break;
    default:
      return { data: [], error: 'Geçersiz filtre' };
  }

  const { data, error } = await query;
  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data ?? []) as AccountLifecycleAccountRow[], error: null };
}

export async function setLifecycleInProgress(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_lifecycle_in_progress', {
    p_request_id: requestId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function resolveLifecycleRequest(
  requestId: string,
  status: 'approved' | 'rejected' | 'closed',
  adminNote: string,
  applyAction: 'none' | 'reactivate' | 'cancel_deletion' = 'none',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_resolve_lifecycle_request', {
    p_request_id: requestId,
    p_status: status,
    p_admin_note: adminNote.trim() || null,
    p_apply_action: applyAction,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function adminReactivateAccount(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_reactivate_account', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function adminCancelUserDeletion(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_user_deletion', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
