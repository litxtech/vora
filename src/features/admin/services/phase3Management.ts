import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type StaffRequestRow = {
  id: string;
  title: string;
  description: string;
  region_id: string;
  job_type: string;
  status: string;
  author_username: string;
  created_at: string;
};

export async function fetchStaffRequests(): Promise<StaffRequestRow[]> {
  const { data, error } = await supabase.rpc('admin_list_staff_requests', { p_limit: 50 });
  if (error || !data) return [];
  return data as StaffRequestRow[];
}

export async function updateStaffRequestStatus(
  id: string,
  status: 'published' | 'hidden' | 'removed',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_staff_request_status', { p_id: id, p_status: status });
  return { error: supabaseErrorMessage(error) };
}

export type JobSeekerRow = {
  id: string;
  user_id: string;
  username: string;
  title: string;
  occupation: string;
  region_id: string;
  is_ready: boolean;
  is_visible_on_map: boolean;
  status: string;
  created_at: string;
};

export async function fetchJobSeekers(): Promise<JobSeekerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_job_seekers', { p_limit: 50 });
  if (error || !data) return [];
  return data as JobSeekerRow[];
}

export async function updateJobSeekerStatus(
  id: string,
  status: 'published' | 'hidden' | 'removed',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_job_seeker_status', { p_id: id, p_status: status });
  return { error: supabaseErrorMessage(error) };
}

export type BusinessCampaignRow = {
  id: string;
  business_id: string;
  business_name: string;
  owner_username: string;
  title: string;
  description: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

export async function fetchBusinessCampaigns(): Promise<BusinessCampaignRow[]> {
  const { data, error } = await supabase.rpc('admin_list_business_campaigns', { p_limit: 50 });
  if (error || !data) return [];
  return data as BusinessCampaignRow[];
}

export async function moderateBusinessCampaign(
  id: string,
  status: 'published' | 'hidden' | 'removed',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_moderate_business_campaign', { p_id: id, p_status: status });
  return { error: supabaseErrorMessage(error) };
}

export async function overrideNewsVerification(
  id: string,
  result: 'correct' | 'incorrect' | 'unverified',
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_override_news_verification', {
    p_id: id,
    p_result: result,
    p_note: note ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeNewsVerification(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_news_verification', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export type CallSessionRow = {
  id: string;
  caller_id: string;
  callee_id: string;
  caller_username: string;
  callee_username: string;
  call_type: string;
  status: string;
  channel_name: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export async function fetchCallSessions(limit = 100): Promise<CallSessionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_call_sessions', { p_limit: limit });
  if (error || !data) return [];
  return data as CallSessionRow[];
}

export async function terminateCallSession(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_terminate_call_session', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export async function terminateAllLiveCallSessions(): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_terminate_all_call_sessions');
  if (error) return { count: 0, error: supabaseErrorMessage(error)! };
  return { count: typeof data === 'number' ? data : 0, error: null };
}

export type DailyAgendaRow = {
  id: string;
  tag: string;
  label: string;
  region_id: string | null;
  scope: string;
  priority: number;
  agenda_date: string;
  is_manual: boolean;
  created_at: string;
};

export async function fetchDailyAgenda(): Promise<DailyAgendaRow[]> {
  const { data, error } = await supabase.rpc('admin_list_daily_agenda', { p_limit: 50 });
  if (error || !data) return [];
  return data as DailyAgendaRow[];
}

export async function upsertDailyAgenda(params: {
  id?: string;
  tag: string;
  label: string;
  regionId?: string;
  scope?: string;
  priority?: number;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_upsert_daily_agenda', {
    p_id: params.id ?? null,
    p_tag: params.tag,
    p_label: params.label,
    p_region_id: params.regionId ?? null,
    p_scope: params.scope ?? 'region',
    p_priority: params.priority ?? 0,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function deleteDailyAgenda(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_daily_agenda', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export type ProfileBoostRow = {
  user_id: string;
  username: string;
  profile_boosted_until: string | null;
  is_premium: boolean;
};

export async function fetchProfileBoosts(): Promise<ProfileBoostRow[]> {
  const { data, error } = await supabase.rpc('admin_list_profile_boosts', { p_limit: 50 });
  if (error || !data) return [];
  return data as ProfileBoostRow[];
}

export async function revokeProfileBoost(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_profile_boost', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export async function grantProfileBoost(userId: string, days = 7): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_profile_boost', { p_user_id: userId, p_days: days });
  return { error: supabaseErrorMessage(error) };
}

export type UserBlockRow = {
  blocker_id: string;
  blocker_username: string;
  blocked_id: string;
  blocked_username: string;
  is_restricted: boolean;
  created_at: string;
};

export async function fetchUserBlocks(): Promise<UserBlockRow[]> {
  const { data, error } = await supabase.rpc('admin_list_user_blocks', { p_limit: 50 });
  if (error || !data) return [];
  return data as UserBlockRow[];
}

export type UserMuteRow = {
  muter_id: string;
  muter_username: string;
  muted_id: string;
  muted_username: string;
  created_at: string;
};

export async function fetchUserMutes(): Promise<UserMuteRow[]> {
  const { data, error } = await supabase.rpc('admin_list_user_mutes', { p_limit: 50 });
  if (error || !data) return [];
  return data as UserMuteRow[];
}

export async function removeUserBlock(blockerId: string, blockedId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_user_block', {
    p_blocker_id: blockerId,
    p_blocked_id: blockedId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeUserMute(muterId: string, mutedId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_user_mute', {
    p_muter_id: muterId,
    p_muted_id: mutedId,
  });
  return { error: supabaseErrorMessage(error) };
}
