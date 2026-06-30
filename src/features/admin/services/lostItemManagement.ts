import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

export type AdminLostItemRow = {
  id: string;
  title: string;
  description: string;
  item_type: 'lost' | 'found';
  category: string;
  status: 'open' | 'resolved';
  is_urgent: boolean;
  region_id: string;
  created_at: string;
  author_username: string;
};

export async function fetchAdminLostItems(): Promise<AdminLostItemRow[]> {
  const { data, error } = await supabase.rpc('get_admin_lost_items', { p_limit: 50 });
  if (error || !data) return [];
  return data as AdminLostItemRow[];
}

export async function removeLostItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_lost_item', { p_item_id: itemId });
  if (!error) {
    notifyMapMarkerRemovedBySource('lost_found', itemId);
  }
  return { error: supabaseErrorMessage(error) };
}
