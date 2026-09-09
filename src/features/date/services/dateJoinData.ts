import type { DateJoinRequest, DateJoinStatus, DateParticipant } from '@/features/date/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { fetchDateParticipantProfiles, type DateUserSnippet } from '@/features/date/services/dateProfiles';

type ProfileSnippet = DateUserSnippet;

type DateJoinRequestRow = {
  id: string;
  outing_id: string;
  requester_id: string;
  companion_user_id: string | null;
  message: string | null;
  seats_requested: number;
  status: DateJoinStatus;
  created_at: string;
};

type DateOutingTitleRow = {
  id: string;
  title: string;
};

function mapParticipant(userId: string, profile: ProfileSnippet | undefined): DateParticipant {
  return {
    userId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.fullName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    gender: profile?.gender ?? null,
  };
}

async function fetchProfileMap(userIds: string[]): Promise<Map<string, ProfileSnippet>> {
  return fetchDateParticipantProfiles(userIds);
}

function mapJoinRequest(
  row: DateJoinRequestRow,
  profileMap: Map<string, ProfileSnippet>,
  outingTitle?: string,
): DateJoinRequest {
  return {
    id: row.id,
    outingId: row.outing_id,
    requesterId: row.requester_id,
    requester: mapParticipant(row.requester_id, profileMap.get(row.requester_id)),
    companion: row.companion_user_id
      ? mapParticipant(row.companion_user_id, profileMap.get(row.companion_user_id))
      : null,
    message: row.message,
    seatsRequested: row.seats_requested,
    status: row.status,
    createdAt: row.created_at,
    outingTitle,
  };
}

export async function sendDateJoinRequest(
  outingId: string,
  message?: string | null,
  companionUserId?: string | null,
): Promise<{ requestId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('date_send_join_request' as never, {
    p_outing_id: outingId,
    p_message: message ?? null,
    p_companion_user_id: companionUserId ?? null,
  } as never);

  if (error) return { requestId: null, error: supabaseErrorMessage(error) };
  return { requestId: (data as string | null) ?? null, error: null };
}

export async function respondDateJoinRequest(
  requestId: string,
  approve: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('date_respond_join_request' as never, {
    p_request_id: requestId,
    p_approve: approve,
  } as never);
  return { error: supabaseErrorMessage(error) };
}

export async function withdrawDateJoinRequest(requestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('date_withdraw_join_request' as never, {
    p_request_id: requestId,
  } as never);
  return { error: supabaseErrorMessage(error) };
}

export async function fetchPendingRequestsForCreator(creatorId: string): Promise<DateJoinRequest[]> {
  const { data: outings } = await supabase
    .from('date_outings' as never)
    .select('id, title')
    .eq('creator_id' as never, creatorId)
    .in('status' as never, ['open', 'full']);

  const outingRows = (outings ?? []) as DateOutingTitleRow[];
  if (outingRows.length === 0) return [];

  const outingIds = outingRows.map((row) => row.id);
  const titleById = Object.fromEntries(outingRows.map((row) => [row.id, row.title]));

  const { data, error } = await supabase
    .from('date_join_requests' as never)
    .select('id, outing_id, requester_id, companion_user_id, message, seats_requested, status, created_at')
    .in('outing_id' as never, outingIds)
    .eq('status' as never, 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as DateJoinRequestRow[];
  const profileMap = await fetchProfileMap(
    rows.flatMap((row) => [row.requester_id, row.companion_user_id].filter(Boolean) as string[]),
  );

  return rows.map((row) => mapJoinRequest(row, profileMap, titleById[row.outing_id]));
}

export async function fetchMyOutgoingJoinRequests(userId: string): Promise<DateJoinRequest[]> {
  const { data, error } = await supabase
    .from('date_join_requests' as never)
    .select('id, outing_id, requester_id, companion_user_id, message, seats_requested, status, created_at')
    .eq('requester_id' as never, userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) return [];

  const rows = data as DateJoinRequestRow[];
  const outingIds = [...new Set(rows.map((row) => row.outing_id))];
  let titleById: Record<string, string> = {};

  if (outingIds.length > 0) {
    const { data: outings } = await supabase
      .from('date_outings' as never)
      .select('id, title')
      .in('id' as never, outingIds);
    titleById = Object.fromEntries(
      ((outings ?? []) as DateOutingTitleRow[]).map((row) => [row.id, row.title]),
    );
  }

  const profileMap = await fetchProfileMap(
    rows.flatMap((row) => [row.requester_id, row.companion_user_id].filter(Boolean) as string[]),
  );

  return rows.map((row) => mapJoinRequest(row, profileMap, titleById[row.outing_id]));
}

export async function fetchPendingRequestsForOuting(outingId: string): Promise<DateJoinRequest[]> {
  const { data, error } = await supabase
    .from('date_join_requests' as never)
    .select('id, outing_id, requester_id, companion_user_id, message, seats_requested, status, created_at')
    .eq('outing_id' as never, outingId)
    .eq('status' as never, 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as DateJoinRequestRow[];
  const profileMap = await fetchProfileMap(
    rows.flatMap((row) => [row.requester_id, row.companion_user_id].filter(Boolean) as string[]),
  );

  return rows.map((row) => mapJoinRequest(row, profileMap));
}
