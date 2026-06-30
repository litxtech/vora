import { supabase } from '@/lib/supabase/client';
import type { BroadcastType } from '@/features/admin/types';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  cancelScheduledBroadcast,
  createScheduledBroadcast,
  deleteScheduledBroadcast,
  fetchScheduledBroadcasts,
  updateScheduledBroadcast,
  type ScheduledBroadcastRow,
} from '@/features/admin/services/broadcasts';

export type { ScheduledBroadcastRow };

export {
  cancelScheduledBroadcast,
  createScheduledBroadcast,
  deleteScheduledBroadcast,
  fetchScheduledBroadcasts,
  updateScheduledBroadcast,
};

export async function createScheduledBroadcastLegacy(
  title: string,
  body: string,
  broadcastType: BroadcastType,
  scheduledAt: string,
  regionId?: string,
): Promise<{ error: string | null }> {
  return createScheduledBroadcast(title, body, broadcastType, scheduledAt, {
    segment: 'all',
    regionId: regionId ?? null,
  });
}

export async function updateScheduledBroadcastLegacy(
  id: string,
  title: string,
  body: string,
  broadcastType: BroadcastType,
  scheduledAt: string,
): Promise<{ error: string | null }> {
  return updateScheduledBroadcast(id, title, body, broadcastType, scheduledAt, { segment: 'all' });
}

export type MessagingReportRow = {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
};

export async function fetchMessagingReports(): Promise<MessagingReportRow[]> {
  const { data, error } = await supabase.rpc('admin_list_messaging_reports', { p_limit: 50 });
  if (error || !data) return [];
  return data as MessagingReportRow[];
}

export type VoraStudioJobRow = {
  id: string;
  user_id: string;
  username: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchVoraStudioJobs(): Promise<VoraStudioJobRow[]> {
  const { data, error } = await supabase.rpc('admin_list_vora_studio_jobs', { p_limit: 50 });
  if (error || !data) return [];
  return data as VoraStudioJobRow[];
}

export async function cancelVoraStudioJob(jobId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_vora_studio_job', { p_job_id: jobId });
  return { error: supabaseErrorMessage(error) };
}

export async function retryVoraStudioJob(jobId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_retry_vora_studio_job', { p_job_id: jobId });
  return { error: supabaseErrorMessage(error) };
}

export type ModeratorWorkloadRow = {
  id: string;
  username: string;
  full_name: string | null;
  assigned_reports: number;
  actions_7d: number;
};

export async function fetchModeratorWorkload(): Promise<ModeratorWorkloadRow[]> {
  const { data, error } = await supabase.rpc('admin_moderator_workload');
  if (error || !data) return [];
  return data as ModeratorWorkloadRow[];
}
