import { supabase } from '@/lib/supabase/client';
import type { ReportQueueStatus } from '@/features/admin/types';
import type { ReportReason } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchReports(filters?: {
  status?: ReportQueueStatus;
  reason?: ReportReason;
}) {
  let query = supabase
    .from('content_reports')
    .select(
      'id, reporter_id, target_type, target_id, reason, details, status, priority, assigned_to, resolved_at, resolution_note, created_at',
    )
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.reason) query = query.eq('reason', filters.reason);

  const { data, error } = await query;
  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function assignReport(reportId: string, moderatorId: string) {
  const { error } = await supabase
    .from('content_reports')
    .update({ status: 'reviewing', assigned_to: moderatorId })
    .eq('id', reportId);
  return { error: supabaseErrorMessage(error) };
}

export async function resolveReport(
  reportId: string,
  status: ReportQueueStatus,
  resolutionNote?: string,
  action?: 'warn' | 'hide' | 'remove' | 'ban',
) {
  const { error } = await supabase.rpc('admin_resolve_report', {
    p_report_id: reportId,
    p_status: status,
    p_resolution_note: resolutionNote ?? null,
    p_action: action ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}
