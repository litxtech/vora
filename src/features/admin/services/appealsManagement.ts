import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AppealRow = {
  id: string;
  user_id: string;
  username: string;
  appeal_type: 'ban' | 'content_removal' | 'account_suspension' | 'other';
  reference_id: string | null;
  reference_type: string | null;
  reason: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  created_at: string;
};

export async function fetchAppeals(
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' = 'pending',
): Promise<AppealRow[]> {
  const { data, error } = await supabase.rpc('admin_list_appeals', {
    p_status: status,
    p_limit: 50,
  });
  if (error || !data) return [];
  return data as AppealRow[];
}

export async function resolveAppeal(
  appealId: string,
  status: 'approved' | 'rejected',
  note?: string,
  liftBan = false,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_resolve_appeal', {
    p_appeal_id: appealId,
    p_status: status,
    p_note: note ?? null,
    p_lift_ban: liftBan,
  });
  return { error: supabaseErrorMessage(error) };
}
