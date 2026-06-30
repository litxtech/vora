import type { SupportTicketRow } from '@/features/support/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchMySupportTickets(limit = 50): Promise<SupportTicketRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, category, subject, message, status, admin_note, lifecycle_request_id, created_at, updated_at, resolved_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as SupportTicketRow[];
}

export async function fetchSupportTicket(id: string): Promise<SupportTicketRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, category, subject, message, status, admin_note, lifecycle_request_id, created_at, updated_at, resolved_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupportTicketRow;
}

export async function submitSupportTicket(
  category: string,
  subject: string,
  message: string,
  lifecycleRequestId?: string,
): Promise<{ ticketId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_support_ticket', {
    p_category: category,
    p_subject: subject.trim(),
    p_message: message.trim(),
    p_lifecycle_request_id: lifecycleRequestId ?? null,
  });

  if (error) return { ticketId: null, error: supabaseErrorMessage(error)! };
  return { ticketId: data as string, error: null };
}
