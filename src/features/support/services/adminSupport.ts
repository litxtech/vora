import type {
  AdminSupportTicketDetail,
  LinkedLifecycleRequest,
  SupportTicketRow,
  SupportTicketStatus,
  SupportTicketUserContext,
} from '@/features/support/types';
import { fetchAdminUserKuru } from '@/features/admin/services/kuruManagement';
import { fetchAdminUser } from '@/features/admin/services/userManagement';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAdminSupportTickets(
  status: SupportTicketStatus | 'all' = 'all',
): Promise<{ data: SupportTicketRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_support_tickets', {
    p_status: status,
    p_limit: 50,
  });

  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data ?? []) as SupportTicketRow[], error: null };
}

export async function fetchAdminSupportTicketDetail(
  ticketId: string,
): Promise<{ data: AdminSupportTicketDetail | null; error: string | null }> {
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(
      'id, user_id, category, subject, message, status, admin_note, lifecycle_request_id, created_at, updated_at, resolved_at',
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  if (!ticket) return { data: null, error: 'Talep bulunamadı' };

  const [{ data: adminUser }, { summary: kuruSummary }] = await Promise.all([
    fetchAdminUser(ticket.user_id as string),
    fetchAdminUserKuru(ticket.user_id as string),
  ]);

  if (!adminUser) return { data: null, error: 'Kullanıcı bulunamadı' };

  let lifecycleRequest: LinkedLifecycleRequest | null = null;
  if (ticket.lifecycle_request_id) {
    const { data: lifecycle } = await supabase
      .from('account_lifecycle_requests')
      .select(
        'id, request_type, message, status, account_status_snapshot, admin_note, created_at, resolved_at',
      )
      .eq('id', ticket.lifecycle_request_id)
      .maybeSingle();

    if (lifecycle) lifecycleRequest = lifecycle as LinkedLifecycleRequest;
  }

  const user: SupportTicketUserContext = {
    id: adminUser.id as string,
    username: adminUser.username as string,
    full_name: (adminUser.full_name as string | null) ?? null,
    avatar_url: (adminUser.avatar_url as string | null) ?? null,
    account_status: adminUser.account_status as string,
    role: adminUser.role as string,
    trust_score: Number(adminUser.trust_score ?? 0),
    is_premium: Boolean(adminUser.is_premium),
    is_guest: Boolean(adminUser.is_guest),
    region_id: (adminUser.region_id as string | null) ?? null,
    created_at: adminUser.created_at as string,
    last_seen_at: (adminUser.last_seen_at as string | null) ?? null,
    deletion_requested_at: (adminUser.deletion_requested_at as string | null) ?? null,
    deleted_at: (adminUser.deleted_at as string | null) ?? null,
    email: (adminUser.email as string | null) ?? null,
    report_count: Number(adminUser.report_count ?? 0),
  };

  return {
    data: {
      ...(ticket as SupportTicketRow),
      user,
      lifecycle_request: lifecycleRequest,
      kuru_balance: kuruSummary.balance,
    },
    error: null,
  };
}

export async function adminUpdateSupportTicket(
  ticketId: string,
  status: SupportTicketStatus,
  adminNote?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_support_ticket', {
    p_ticket_id: ticketId,
    p_status: status,
    p_admin_note: adminNote?.trim() || null,
  });

  return { error: supabaseErrorMessage(error) };
}
