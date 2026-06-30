import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminProximityPresenceRow = {
  user_id: string;
  username: string;
  region_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export type AdminProximityInteractionRow = {
  user_low: string;
  user_low_username: string;
  user_high: string;
  user_high_username: string;
  low_decision: string | null;
  high_decision: string | null;
  matched_at: string | null;
  created_at: string;
};

export async function fetchAdminProximityPresence(limit = 50): Promise<AdminProximityPresenceRow[]> {
  const { data, error } = await supabase.rpc('admin_list_proximity_presence', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminProximityPresenceRow[];
}

export async function fetchAdminProximityInteractions(limit = 50): Promise<AdminProximityInteractionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_proximity_interactions', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminProximityInteractionRow[];
}

export async function adminClearProximityPresence(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_clear_proximity_presence', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
