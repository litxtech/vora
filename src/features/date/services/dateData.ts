import type {
  CreateDateInput,
  DateOuting,
  DateParticipant,
  DateSoughtGender,
  DateStatus,
} from '@/features/date/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { fetchDateParticipantProfiles, type DateUserSnippet } from '@/features/date/services/dateProfiles';

type DateOutingRow = {
  id: string;
  creator_id: string;
  title: string;
  activity: string;
  destination: string;
  looking_for: string;
  category: string | null;
  organizer_count: number;
  seeking_count: number;
  approved_count: number;
  sought_gender: DateSoughtGender;
  scheduled_at: string | null;
  description: string | null;
  status: DateStatus;
  region_id: string | null;
  created_at: string;
};

type DateOrganizerRow = {
  user_id: string;
  is_creator: boolean;
};

type DateMemberRow = {
  user_id: string;
};

type ProfileSnippet = DateUserSnippet;

type DateConversationRow = {
  conversation_id: string;
};

type DateJoinRequestIdRow = {
  id: string;
};

function mapParticipant(
  userId: string,
  profile: ProfileSnippet | undefined,
  isCreator = false,
): DateParticipant {
  return {
    userId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.fullName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    gender: profile?.gender ?? null,
    isCreator,
  };
}

function mapOutingRow(
  row: DateOutingRow,
  organizers: DateParticipant[],
  approvedMembers: DateParticipant[],
  conversationId: string | null,
  viewerId: string | null,
  myPendingRequestId: string | null,
): DateOuting {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    activity: row.activity,
    destination: row.destination,
    lookingFor: row.looking_for,
    category: row.category,
    organizerCount: row.organizer_count,
    seekingCount: row.seeking_count,
    approvedCount: row.approved_count,
    soughtGender: row.sought_gender,
    scheduledAt: row.scheduled_at,
    description: row.description,
    status: row.status,
    regionId: row.region_id,
    createdAt: row.created_at,
    organizers,
    approvedMembers,
    conversationId,
    myPendingRequestId,
    isOrganizer: !!viewerId && organizers.some((o) => o.userId === viewerId),
    isApprovedMember: !!viewerId && approvedMembers.some((m) => m.userId === viewerId),
  };
}

async function fetchProfileMap(userIds: string[]): Promise<Map<string, ProfileSnippet>> {
  return fetchDateParticipantProfiles(userIds);
}

async function fetchParticipantsForOuting(outingId: string): Promise<{
  organizers: DateParticipant[];
  approvedMembers: DateParticipant[];
}> {
  const [orgRes, memRes] = await Promise.all([
    supabase
      .from('date_organizers' as never)
      .select('user_id, is_creator')
      .eq('outing_id' as never, outingId),
    supabase
      .from('date_approved_members' as never)
      .select('user_id')
      .eq('outing_id' as never, outingId),
  ]);

  const organizersRaw = (orgRes.data ?? []) as DateOrganizerRow[];
  const membersRaw = (memRes.data ?? []) as DateMemberRow[];
  const profileMap = await fetchProfileMap([
    ...organizersRaw.map((row) => row.user_id),
    ...membersRaw.map((row) => row.user_id),
  ]);

  return {
    organizers: organizersRaw.map((row) =>
      mapParticipant(row.user_id, profileMap.get(row.user_id), row.is_creator),
    ),
    approvedMembers: membersRaw.map((row) =>
      mapParticipant(row.user_id, profileMap.get(row.user_id)),
    ),
  };
}

async function fetchConversationId(outingId: string): Promise<string | null> {
  const { data } = await supabase
    .from('date_outing_conversations' as never)
    .select('conversation_id')
    .eq('outing_id' as never, outingId)
    .maybeSingle();

  return ((data as DateConversationRow | null)?.conversation_id) ?? null;
}

async function fetchPendingRequestId(outingId: string, viewerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('date_join_requests' as never)
    .select('id')
    .eq('outing_id' as never, outingId)
    .eq('requester_id' as never, viewerId)
    .eq('status' as never, 'pending')
    .maybeSingle();

  return ((data as DateJoinRequestIdRow | null)?.id) ?? null;
}

export async function createDateOuting(input: CreateDateInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('date_create_outing' as never, {
    p_title: input.title,
    p_activity: input.activity,
    p_destination: input.destination,
    p_looking_for: input.lookingFor,
    p_organizer_count: input.organizerCount,
    p_seeking_count: input.seekingCount,
    p_sought_gender: input.soughtGender,
    p_category: input.category ?? null,
    p_scheduled_at: input.scheduledAt ?? null,
    p_description: input.description ?? null,
    p_region_id: input.regionId ?? null,
    p_organizer_user_ids: input.organizerUserIds ?? [],
  } as never);

  if (error) return { id: null, error: supabaseErrorMessage(error) };
  return { id: (data as string | null) ?? null, error: null };
}

export async function fetchOpenDateOutings(viewerId: string | null): Promise<DateOuting[]> {
  const { data, error } = await supabase
    .from('date_outings' as never)
    .select('*')
    .eq('status' as never, 'open')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const rows = data as DateOutingRow[];
  const outings = await Promise.all(
    rows.map(async (row) => {
      const [{ organizers, approvedMembers }, conversationId, myPendingRequestId] = await Promise.all([
        fetchParticipantsForOuting(row.id),
        fetchConversationId(row.id),
        viewerId ? fetchPendingRequestId(row.id, viewerId) : Promise.resolve(null),
      ]);

      return mapOutingRow(
        row,
        organizers,
        approvedMembers,
        conversationId,
        viewerId,
        myPendingRequestId,
      );
    }),
  );

  return outings;
}

export async function fetchMyDateOutings(userId: string): Promise<DateOuting[]> {
  const [createdRes, memberRes] = await Promise.all([
    supabase
      .from('date_outings' as never)
      .select('*')
      .eq('creator_id' as never, userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('date_approved_members' as never)
      .select('outing_id')
      .eq('user_id' as never, userId),
  ]);

  const memberIds = ((memberRes.data ?? []) as { outing_id: string }[]).map((row) => row.outing_id);
  let joinedRows: DateOutingRow[] = [];
  if (memberIds.length > 0) {
    const joinedRes = await supabase
      .from('date_outings' as never)
      .select('*')
      .in('id' as never, memberIds);
    joinedRows = (joinedRes.data ?? []) as DateOutingRow[];
  }

  const byId = new Map<string, DateOutingRow>();
  for (const row of [...((createdRes.data ?? []) as DateOutingRow[]), ...joinedRows]) {
    byId.set(row.id, row);
  }

  const outings = await Promise.all(
    [...byId.values()].map(async (row) => {
      const [{ organizers, approvedMembers }, conversationId] = await Promise.all([
        fetchParticipantsForOuting(row.id),
        fetchConversationId(row.id),
      ]);
      return mapOutingRow(row, organizers, approvedMembers, conversationId, userId, null);
    }),
  );

  return outings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchDateOutingById(id: string, viewerId: string | null): Promise<DateOuting | null> {
  const { data, error } = await supabase
    .from('date_outings' as never)
    .select('*')
    .eq('id' as never, id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as DateOutingRow;
  const [{ organizers, approvedMembers }, conversationId, myPendingRequestId] = await Promise.all([
    fetchParticipantsForOuting(id),
    fetchConversationId(id),
    viewerId ? fetchPendingRequestId(id, viewerId) : Promise.resolve(null),
  ]);

  return mapOutingRow(
    row,
    organizers,
    approvedMembers,
    conversationId,
    viewerId,
    myPendingRequestId,
  );
}

export async function cancelDateOuting(outingId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('date_cancel_outing' as never, {
    p_outing_id: outingId,
  } as never);
  return { error: supabaseErrorMessage(error) };
}

export async function ensureDateConversation(
  outingId: string,
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('ensure_date_outing_conversation' as never, {
    p_outing_id: outingId,
  } as never);
  if (error) return { conversationId: null, error: supabaseErrorMessage(error) };
  return { conversationId: (data as string | null) ?? null, error: null };
}
