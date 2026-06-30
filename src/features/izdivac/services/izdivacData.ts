import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { IzdivacLobbyState, IzdivacParticipant } from '@/features/izdivac/types';
import type { GenderId } from '@/constants/registration';

type RpcParticipantRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  age_years: number | null;
  gender: GenderId;
  is_online: boolean | null;
  in_lobby?: boolean | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  special_badges?: string[] | null;
};

const VALID_BADGES = ['jigolo', 'tilki', 'finansman'] as const;

function normalizeBadges(raw: unknown): IzdivacParticipant['specialBadges'] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is IzdivacParticipant['specialBadges'][number] =>
    (VALID_BADGES as readonly string[]).includes(b),
  );
}

function mapParticipant(row: RpcParticipantRow): IzdivacParticipant {
  const avatarRaw = row.avatar_url ?? (row as { avatarUrl?: string | null }).avatarUrl;
  const coverRaw = row.cover_url ?? (row as { coverUrl?: string | null }).coverUrl;

  return {
    userId: row.user_id,
    firstName: row.first_name?.trim() || 'Üye',
    lastName: row.last_name?.trim() || null,
    ageYears: row.age_years != null ? Number(row.age_years) : null,
    gender: row.gender,
    isOnline: Boolean(row.is_online),
    inLobby: Boolean(row.in_lobby),
    avatarUrl: typeof avatarRaw === 'string' ? avatarRaw.trim() || null : null,
    coverUrl: typeof coverRaw === 'string' ? coverRaw.trim() || null : null,
    specialBadges: normalizeBadges(row.special_badges),
  };
}

export async function joinIzdivacLobby(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('izdivac_join_lobby');
  return { error: supabaseErrorMessage(error) };
}

export async function leaveIzdivacLobby(): Promise<void> {
  await supabase.rpc('izdivac_leave_lobby');
}

export async function heartbeatIzdivacLobby(): Promise<void> {
  await supabase.rpc('izdivac_heartbeat');
}

export async function fetchIzdivacParticipants(): Promise<{
  data: IzdivacLobbyState;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('izdivac_list_participants');
  if (error) {
    return {
      data: { women: [], men: [] },
      error: supabaseErrorMessage(error),
    };
  }

  const rows = (data ?? []) as RpcParticipantRow[];
  const women: IzdivacParticipant[] = [];
  const men: IzdivacParticipant[] = [];

  for (const row of rows) {
    const participant = mapParticipant(row);
    if (participant.gender === 'female') women.push(participant);
    else if (participant.gender === 'male') men.push(participant);
  }

  return { data: { women, men }, error: null };
}
