import type { RegionId } from '@/constants/regions';
import { regionNameById } from '@/constants/regions';
import type {
  CityElectionCandidate,
  CityElectionDetail,
  CityElectionStatus,
  CityElectionSummary,
  CityHistoryEvent,
  CityLeadershipTerm,
} from '@/features/city-governance/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ElectionRow = {
  id: string;
  region_id: string;
  title: string;
  description: string | null;
  status: CityElectionStatus;
  starts_at: string;
  nomination_ends_at: string;
  voting_starts_at: string;
  ends_at: string;
};

type CandidateRow = {
  id: string;
  election_id: string;
  user_id: string;
  statement: string | null;
  status: CityElectionCandidate['status'];
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }[] | null;
};

function unwrapProfile<T extends { username: string }>(row: T | T[] | null): T | null {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function mapElectionSummary(row: ElectionRow): CityElectionSummary {
  return {
    id: row.id,
    regionId: row.region_id as RegionId,
    title: row.title,
    description: row.description,
    status: row.status,
    startsAt: row.starts_at,
    nominationEndsAt: row.nomination_ends_at,
    votingStartsAt: row.voting_starts_at,
    endsAt: row.ends_at,
  };
}

export async function fetchActiveCityElection(
  regionId: RegionId,
): Promise<CityElectionSummary | null> {
  const { data, error } = await supabase
    .from('city_elections')
    .select('id, region_id, title, description, status, starts_at, nomination_ends_at, voting_starts_at, ends_at')
    .eq('region_id', regionId)
    .in('status', ['scheduled', 'nomination', 'voting', 'counting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(supabaseErrorMessage(error));
  if (!data) return null;
  return mapElectionSummary(data as ElectionRow);
}

export async function refreshCityElectionStatus(electionId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_city_election_status', { p_election_id: electionId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function fetchCityElectionDetail(
  electionId: string,
  viewerUserId: string | null,
): Promise<CityElectionDetail | null> {
  await refreshCityElectionStatus(electionId).catch(() => undefined);

  const { data: election, error: electionError } = await supabase
    .from('city_elections')
    .select('id, region_id, title, description, status, starts_at, nomination_ends_at, voting_starts_at, ends_at')
    .eq('id', electionId)
    .maybeSingle();

  if (electionError) throw new Error(supabaseErrorMessage(electionError));
  if (!election) return null;

  const electionRow = election as ElectionRow;
  const regionId = electionRow.region_id as RegionId;

  const [candidatesResult, voteCountsResult, myVoteResult, eligibilityResult, regionResult] =
    await Promise.all([
      supabase
        .from('city_election_candidates')
        .select('id, election_id, user_id, statement, status, profiles:user_id (id, username, full_name, avatar_url)')
        .eq('election_id', electionId)
        .in('status', ['approved', 'pending'])
        .order('created_at', { ascending: true }),
      supabase.rpc('get_city_election_vote_counts', { p_election_id: electionId }),
      viewerUserId
        ? supabase
            .from('city_election_votes')
            .select('candidate_user_id')
            .eq('election_id', electionId)
            .eq('voter_user_id', viewerUserId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      viewerUserId
        ? supabase.rpc('_city_election_eligible', {
            p_user_id: viewerUserId,
            p_region_id: regionId,
          })
        : Promise.resolve({ data: false, error: null }),
      supabase.from('regions').select('id, slug, name').eq('id', regionId).maybeSingle(),
    ]);

  if (candidatesResult.error) throw new Error(supabaseErrorMessage(candidatesResult.error));
  if (voteCountsResult.error) throw new Error(supabaseErrorMessage(voteCountsResult.error));
  if (myVoteResult.error) throw new Error(supabaseErrorMessage(myVoteResult.error));

  const voteCountMap = new Map<string, number>();
  for (const row of (voteCountsResult.data ?? []) as { candidate_user_id: string; vote_count: number }[]) {
    voteCountMap.set(row.candidate_user_id, Number(row.vote_count));
  }

  const candidates: CityElectionCandidate[] = ((candidatesResult.data ?? []) as CandidateRow[]).map((row) => {
    const profile = unwrapProfile(row.profiles);
    return {
      id: row.id,
      electionId: row.election_id,
      userId: row.user_id,
      username: profile?.username ?? 'user',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      statement: row.statement,
      status: row.status,
      voteCount: voteCountMap.get(row.user_id) ?? 0,
      isMe: viewerUserId === row.user_id,
    };
  });

  const myCandidacy = candidates.find((c) => c.isMe) ?? null;
  const myVoteCandidateUserId =
    (myVoteResult.data as { candidate_user_id: string } | null)?.candidate_user_id ?? null;
  const isEligible = Boolean(eligibilityResult.data);
  const status = electionRow.status;

  return {
    ...mapElectionSummary(electionRow),
    regionName: regionResult.data?.name ?? regionNameById(regionId) ?? regionId,
    regionSlug: regionResult.data?.slug ?? regionId,
    candidates,
    myVoteCandidateUserId,
    myCandidacy,
    canVote: isEligible && status === 'voting' && !myVoteCandidateUserId,
    canApply: isEligible && status === 'nomination' && !myCandidacy,
    isEligible,
  };
}

export async function applyCityElectionCandidacy(
  electionId: string,
  statement: string,
): Promise<void> {
  const { error } = await supabase.rpc('apply_city_election_candidacy', {
    p_election_id: electionId,
    p_statement: statement,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function castCityElectionVote(
  electionId: string,
  candidateUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc('cast_city_election_vote', {
    p_election_id: electionId,
    p_candidate_user_id: candidateUserId,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function finalizeCityElection(electionId: string): Promise<void> {
  const { error } = await supabase.rpc('finalize_city_election', { p_election_id: electionId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function fetchCityLeadershipHistory(
  regionId: RegionId,
  limit = 6,
): Promise<CityLeadershipTerm[]> {
  const { data, error } = await supabase
    .from('city_leadership_terms')
    .select('id, region_id, user_id, started_at, ended_at, status, profiles:user_id (username, full_name, avatar_url)')
    .eq('region_id', regionId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(supabaseErrorMessage(error));

  return ((data ?? []) as Array<{
    id: string;
    region_id: string;
    user_id: string;
    started_at: string;
    ended_at: string | null;
    status: CityLeadershipTerm['status'];
    profiles: CandidateRow['profiles'];
  }>).map((row) => {
    const profile = unwrapProfile(row.profiles);
    return {
      id: row.id,
      regionId: row.region_id as RegionId,
      userId: row.user_id,
      username: profile?.username ?? 'user',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status,
    };
  });
}

export async function fetchCityHistoryEvents(
  regionId: RegionId,
  limit = 8,
): Promise<CityHistoryEvent[]> {
  const { data, error } = await supabase
    .from('city_history_events')
    .select('id, region_id, event_type, title, description, occurred_at')
    .eq('region_id', regionId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(supabaseErrorMessage(error));

  return (data ?? []).map((row) => ({
    id: row.id,
    regionId: row.region_id as RegionId,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
  }));
}

export function formatElectionCountdown(endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Sona erdi';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days} gün ${hours} saat`;
  if (hours > 0) return `${hours} saat`;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `${minutes} dk`;
}

export function electionStatusLabel(status: CityElectionStatus): string {
  switch (status) {
    case 'nomination':
      return 'Adaylık';
    case 'voting':
      return 'Oy kullanılıyor';
    case 'counting':
      return 'Sayım';
    case 'completed':
      return 'Tamamlandı';
    case 'cancelled':
      return 'İptal';
    case 'scheduled':
      return 'Planlandı';
    default:
      return status;
  }
}
