import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

export type CenterStats = {
  pending_tips: number;
  active_polls: number;
  active_traffic: number;
  open_help: number;
  volunteer_teams: number;
  duty_listings?: number;
  tourism_places?: number;
};

export async function fetchCenterStats(): Promise<CenterStats | null> {
  const { data, error } = await supabase.rpc('admin_center_stats');
  if (error || !data) return null;
  return data as CenterStats;
}

export type TipRow = {
  id: string;
  region_id: string;
  category: string;
  description: string;
  moderation_status: string;
  created_at: string;
};

export async function fetchAnonymousTips(status = 'pending'): Promise<TipRow[]> {
  const { data, error } = await supabase.rpc('admin_list_anonymous_tips', { p_status: status, p_limit: 50 });
  if (error || !data) return [];
  return data as TipRow[];
}

export async function moderateTip(tipId: string, approve: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_moderate_anonymous_tip', { p_tip_id: tipId, p_approve: approve });
  return { error: supabaseErrorMessage(error) };
}

export type PollRow = {
  id: string;
  question: string;
  region_id: string;
  is_active: boolean;
  total_votes: number;
  author_username: string;
  created_at: string;
};

export async function fetchPolls(): Promise<PollRow[]> {
  const { data, error } = await supabase.rpc('admin_list_polls', { p_limit: 50 });
  if (error || !data) return [];
  return data as PollRow[];
}

export async function deactivatePoll(pollId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_deactivate_poll', { p_poll_id: pollId });
  return { error: supabaseErrorMessage(error) };
}

export async function createAdminPoll(
  regionId: string,
  question: string,
  options: string[],
  endsAt?: string | null,
): Promise<{ pollId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_create_poll', {
    p_region_id: regionId,
    p_question: question,
    p_options: options,
    p_ends_at: endsAt ?? null,
  });
  return { pollId: typeof data === 'string' ? data : null, error: supabaseErrorMessage(error) };
}

export type TrafficReportRow = {
  id: string;
  title: string;
  report_type: string;
  region_id: string;
  is_active: boolean;
  confirm_count: number;
  author_username: string;
  created_at: string;
};

export async function fetchTrafficReports(): Promise<TrafficReportRow[]> {
  const { data, error } = await supabase.rpc('admin_list_traffic_reports', { p_limit: 50 });
  if (error || !data) return [];
  return data as TrafficReportRow[];
}

export async function deactivateTrafficReport(reportId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_deactivate_traffic_report', { p_report_id: reportId });
  if (!error) {
    notifyMapMarkerRemovedBySource('traffic', reportId);
  }
  return { error: supabaseErrorMessage(error) };
}

export type HelpRequestRow = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  region_id: string;
  is_resolved: boolean;
  author_username: string;
  created_at: string;
};

export async function fetchHelpRequests(): Promise<HelpRequestRow[]> {
  const { data, error } = await supabase.rpc('admin_list_help_requests', { p_limit: 50 });
  if (error || !data) return [];
  return data as HelpRequestRow[];
}

export async function resolveHelpRequest(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_resolve_help_request', { p_request_id: requestId });
  return { error: supabaseErrorMessage(error) };
}

export type VolunteerTeamRow = {
  id: string;
  name: string;
  category: string;
  region_id: string;
  member_count: number;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
};

export async function fetchVolunteerTeams(): Promise<VolunteerTeamRow[]> {
  const { data, error } = await supabase.rpc('admin_list_volunteer_teams', { p_limit: 50 });
  if (error || !data) return [];
  return data as VolunteerTeamRow[];
}

export async function suspendVolunteerTeam(teamId: string, suspend: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_suspend_volunteer_team', { p_team_id: teamId, p_suspend: suspend });
  return { error: supabaseErrorMessage(error) };
}

export type DutyListingRow = {
  id: string;
  region_id: string;
  listing_type: string;
  name: string;
  address: string | null;
  phone: string | null;
  duty_date: string;
  is_open: boolean;
  created_at: string;
};

export async function fetchDutyListings(): Promise<DutyListingRow[]> {
  const { data, error } = await supabase.rpc('admin_list_duty_listings', { p_limit: 50 });
  if (error || !data) return [];
  return data as DutyListingRow[];
}

export async function removeDutyListing(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_duty_listing', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export type TourismPlaceRow = {
  id: string;
  region_id: string;
  category: string;
  name: string;
  description: string | null;
  is_featured: boolean;
  rating: number | null;
  created_at: string;
};

export async function fetchTourismPlaces(): Promise<TourismPlaceRow[]> {
  const { data, error } = await supabase.rpc('admin_list_tourism_places', { p_limit: 50 });
  if (error || !data) return [];
  return data as TourismPlaceRow[];
}

export async function removeTourismPlace(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_remove_tourism_place', { p_id: id });
  if (!error) {
    notifyMapMarkerRemovedBySource('tourism', id);
  }
  return { error: supabaseErrorMessage(error) };
}

export async function setTourismFeatured(id: string, featured: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_tourism_featured', { p_id: id, p_featured: featured });
  return { error: supabaseErrorMessage(error) };
}
