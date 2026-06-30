import { supabase } from '@/lib/supabase/client';
import type { BroadcastType } from '@/features/admin/types';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  toBroadcastAudiencePayload,
  type BroadcastAudienceFilter,
} from '@/features/admin/constants/broadcastAudience';

export async function previewBroadcastRecipients(audience: BroadcastAudienceFilter) {
  const { data, error } = await supabase.rpc('admin_preview_broadcast_recipients', {
    p_audience: toBroadcastAudiencePayload(audience),
  });
  return { count: (data as number | null) ?? 0, error: supabaseErrorMessage(error) };
}

export async function sendBroadcast(
  type: BroadcastType,
  title: string,
  body: string,
  audience: BroadcastAudienceFilter,
) {
  const { data, error } = await supabase.rpc('admin_send_broadcast', {
    p_type: type,
    p_title: title,
    p_body: body,
    p_audience: toBroadcastAudiencePayload(audience),
  });
  const recipientCount = (data as number | null) ?? 0;
  if (error) {
    return { recipientCount, error: supabaseErrorMessage(error)!, pushProcessed: 0 };
  }

  return {
    recipientCount,
    error: null,
    pushProcessed: recipientCount,
  };
}

export async function sendEmergencyBroadcast(
  title: string,
  body: string,
  regionId?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
  expiresHours = 24,
) {
  const { data, error } = await supabase.rpc('admin_send_emergency', {
    p_title: title,
    p_body: body,
    p_region_id: regionId ?? null,
    p_severity: severity,
    p_expires_hours: expiresHours,
  });
  return { id: data as string | null, error: supabaseErrorMessage(error) };
}

export async function fetchRecentBroadcasts() {
  const { data, error } = await supabase
    .from('admin_broadcasts')
    .select(
      'id, broadcast_type, title, body, region_id, recipient_count, audience_filter, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(20);

  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function fetchActiveEmergencies() {
  const { data, error } = await supabase
    .from('emergency_broadcasts')
    .select('id, title, body, region_id, severity, is_active, expires_at, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function deactivateEmergency(id: string) {
  const { error } = await supabase
    .from('emergency_broadcasts')
    .update({ is_active: false })
    .eq('id', id);
  return { error: supabaseErrorMessage(error) };
}

export type ScheduledBroadcastRow = {
  id: string;
  title: string;
  body: string;
  broadcast_type: string;
  region_id: string | null;
  audience_filter: Record<string, unknown> | null;
  scheduled_at: string;
  is_sent: boolean;
  is_cancelled: boolean;
  recipient_count: number | null;
  created_at: string;
};

export async function fetchScheduledBroadcasts(): Promise<ScheduledBroadcastRow[]> {
  const { data, error } = await supabase.rpc('admin_list_scheduled_broadcasts', { p_limit: 50 });
  if (error || !data) return [];
  return data as ScheduledBroadcastRow[];
}

export async function createScheduledBroadcast(
  title: string,
  body: string,
  broadcastType: BroadcastType,
  scheduledAt: string,
  audience: BroadcastAudienceFilter,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_create_scheduled_broadcast', {
    p_title: title,
    p_body: body,
    p_broadcast_type: broadcastType,
    p_scheduled_at: scheduledAt,
    p_audience: toBroadcastAudiencePayload(audience),
  });
  return { error: supabaseErrorMessage(error) };
}

export async function updateScheduledBroadcast(
  id: string,
  title: string,
  body: string,
  broadcastType: BroadcastType,
  scheduledAt: string,
  audience: BroadcastAudienceFilter,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_scheduled_broadcast', {
    p_id: id,
    p_title: title,
    p_body: body,
    p_broadcast_type: broadcastType,
    p_scheduled_at: scheduledAt,
    p_audience: toBroadcastAudiencePayload(audience),
  });
  return { error: supabaseErrorMessage(error) };
}

export async function cancelScheduledBroadcast(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_scheduled_broadcast', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export async function deleteScheduledBroadcast(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_scheduled_broadcast', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}
