import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

export type AdminEventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  region_id: string;
  status: string;
  ticket_type: string;
  ticket_price_cents: number | null;
  is_featured: boolean;
  is_sponsored: boolean;
  view_count: number;
  organizer_username: string;
  going_count: number;
};

export async function fetchAdminEvents(): Promise<AdminEventRow[]> {
  const { data, error } = await supabase.rpc('get_admin_events', { p_limit: 50 });
  if (error || !data) return [];
  return data as AdminEventRow[];
}

export async function setEventPromotion(
  eventId: string,
  flags: { isFeatured?: boolean; isSponsored?: boolean },
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_event_promotion', {
    p_event_id: eventId,
    p_is_featured: flags.isFeatured ?? null,
    p_is_sponsored: flags.isSponsored ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_event', { p_event_id: eventId });
  if (!error) {
    notifyMapMarkerRemovedBySource('events', eventId);
  }
  return { error: supabaseErrorMessage(error) };
}
