import { supabase } from '@/lib/supabase/client';

export type AdminEventTicketRow = {
  id: string;
  event_id: string;
  event_title: string;
  user_id: string;
  username: string;
  status: string;
  amount_cents: number;
  created_at: string;
};

export type AdminEventCheckinRow = {
  id: string;
  user_id: string;
  username: string;
  checked_in_at: string;
};

export async function fetchAdminEventTickets(
  eventId?: string | null,
  limit = 50,
): Promise<AdminEventTicketRow[]> {
  const { data, error } = await supabase.rpc('admin_list_event_tickets', {
    p_event_id: eventId ?? null,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminEventTicketRow[];
}

export async function fetchAdminEventCheckins(
  eventId: string,
  limit = 50,
): Promise<AdminEventCheckinRow[]> {
  const { data, error } = await supabase.rpc('admin_list_event_checkins', {
    p_event_id: eventId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminEventCheckinRow[];
}
