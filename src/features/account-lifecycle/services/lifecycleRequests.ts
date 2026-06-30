import type { LifecycleRequestType } from '@/features/account-lifecycle/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function submitAccountLifecycleRequest(
  requestType: LifecycleRequestType,
  message: string,
): Promise<{ requestId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_account_lifecycle_request', {
    p_request_type: requestType,
    p_message: message.trim(),
  });

  if (error) return { requestId: null, error: supabaseErrorMessage(error)! };
  return { requestId: data as string, error: null };
}

export async function fetchMyPendingLifecycleRequest(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('account_lifecycle_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_progress'])
    .maybeSingle();

  return !!data;
}
