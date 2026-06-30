import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminExplorerPresenceRow = {
  user_id: string;
  username: string;
  region_id: string;
  latitude: number;
  longitude: number;
  is_visible: boolean;
  updated_at: string;
};

export async function fetchAdminExplorerPresence(limit = 50): Promise<AdminExplorerPresenceRow[]> {
  const { data, error } = await supabase.rpc('admin_list_explorer_presence', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminExplorerPresenceRow[];
}

export async function adminHideExplorerPresence(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_hide_explorer_presence', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
