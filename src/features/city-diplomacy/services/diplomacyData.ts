import type { RegionId } from '@/constants/regions';
import { regionNameById } from '@/constants/regions';
import type {
  CityDiplomacyRequest,
  CityDiplomacyRequestType,
  CityDiplomacyStatus,
} from '@/features/city-diplomacy/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type Row = {
  id: string;
  from_region_id: string;
  to_region_id: string;
  from_leader_user_id: string;
  to_leader_user_id: string;
  request_type: CityDiplomacyRequestType;
  title: string | null;
  message: string | null;
  status: CityDiplomacyStatus;
  call_session_id: string | null;
  voice_room_id: string | null;
  created_at: string;
  responded_at: string | null;
  from_region?: { name: string; slug: string | null } | { name: string; slug: string | null }[];
  to_region?: { name: string; slug: string | null } | { name: string; slug: string | null }[];
  from_leader?: ProfileSnippet | ProfileSnippet[];
  to_leader?: ProfileSnippet | ProfileSnippet[];
};

type ProfileSnippet = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function mapRequest(row: Row): CityDiplomacyRequest {
  const fromRegion = unwrap(row.from_region);
  const toRegion = unwrap(row.to_region);
  const fromLeader = unwrap(row.from_leader);
  const toLeader = unwrap(row.to_leader);
  return {
    id: row.id,
    fromRegionId: row.from_region_id as RegionId,
    toRegionId: row.to_region_id as RegionId,
    fromRegionName: fromRegion?.name ?? regionNameById(row.from_region_id) ?? row.from_region_id,
    toRegionName: toRegion?.name ?? regionNameById(row.to_region_id) ?? row.to_region_id,
    fromLeaderUserId: row.from_leader_user_id,
    toLeaderUserId: row.to_leader_user_id,
    fromLeaderUsername: fromLeader?.username ?? '',
    toLeaderUsername: toLeader?.username ?? '',
    fromLeaderName: fromLeader?.full_name ?? null,
    toLeaderName: toLeader?.full_name ?? null,
    fromLeaderAvatarUrl: fromLeader?.avatar_url ?? null,
    requestType: row.request_type,
    title: row.title,
    message: row.message,
    status: row.status,
    callSessionId: row.call_session_id,
    voiceRoomId: row.voice_room_id,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

const REQUEST_SELECT = `
  *,
  from_region:from_region_id (name, slug),
  to_region:to_region_id (name, slug),
  from_leader:from_leader_user_id (id, username, full_name, avatar_url),
  to_leader:to_leader_user_id (id, username, full_name, avatar_url)
`;

export async function fetchLeaderDiplomacyRequests(userId: string): Promise<CityDiplomacyRequest[]> {
  const { data, error } = await supabase
    .from('city_diplomacy_requests')
    .select(REQUEST_SELECT)
    .or(`from_leader_user_id.eq.${userId},to_leader_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw new Error(supabaseErrorMessage(error));
  return ((data ?? []) as Row[]).map(mapRequest);
}

export async function fetchPendingDiplomacyForLeader(userId: string): Promise<CityDiplomacyRequest[]> {
  const { data, error } = await supabase
    .from('city_diplomacy_requests')
    .select(REQUEST_SELECT)
    .eq('to_leader_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(supabaseErrorMessage(error));
  return ((data ?? []) as Row[]).map(mapRequest);
}

export async function sendDiplomacyRequest(
  toRegionId: RegionId,
  requestType: CityDiplomacyRequestType,
  title?: string,
  message?: string,
): Promise<CityDiplomacyRequest> {
  const { data, error } = await supabase.rpc('send_diplomacy_request', {
    p_to_region_id: toRegionId,
    p_request_type: requestType,
    p_title: title ?? null,
    p_message: message ?? null,
  });
  if (error) throw new Error(supabaseErrorMessage(error));

  const { data: full, error: fetchError } = await supabase
    .from('city_diplomacy_requests')
    .select(REQUEST_SELECT)
    .eq('id', (data as { id: string }).id)
    .single();

  if (fetchError) throw new Error(supabaseErrorMessage(fetchError));
  return mapRequest(full as Row);
}

export async function respondDiplomacyRequest(requestId: string, accept: boolean): Promise<CityDiplomacyRequest> {
  const { data, error } = await supabase.rpc('respond_diplomacy_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw new Error(supabaseErrorMessage(error));

  const { data: full, error: fetchError } = await supabase
    .from('city_diplomacy_requests')
    .select(REQUEST_SELECT)
    .eq('id', (data as { id: string }).id)
    .single();

  if (fetchError) throw new Error(supabaseErrorMessage(fetchError));
  return mapRequest(full as Row);
}

export async function proposeJointRoom(diplomacyRequestId: string): Promise<void> {
  const { error } = await supabase.rpc('propose_joint_room', { p_diplomacy_request_id: diplomacyRequestId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function acceptJointRoom(diplomacyRequestId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_joint_room', {
    p_diplomacy_request_id: diplomacyRequestId,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data as { id: string }).id;
}

export async function fetchCityLeaders(): Promise<
  Array<{ regionId: RegionId; regionName: string; leader: ProfileSnippet | null }>
> {
  const { data, error } = await supabase
    .from('city_memberships')
    .select('region_id, profiles:user_id (id, username, full_name, avatar_url), regions:region_id (name)')
    .eq('status', 'active')
    .eq('role', 'leader');

  if (error) throw new Error(supabaseErrorMessage(error));

  return (data ?? []).map((row) => {
    const profile = unwrap(row.profiles as ProfileSnippet | ProfileSnippet[]);
    const region = unwrap(row.regions as { name: string } | { name: string }[]);
    return {
      regionId: row.region_id as RegionId,
      regionName: region?.name ?? row.region_id,
      leader: profile,
    };
  });
}
