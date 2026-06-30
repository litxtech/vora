import type {
  ProximityMatchCandidate,
  ProximityMatchDecisionResult,
  ProximityMatchDecisionStatus,
  ProximityMatchedUser,
} from '@/features/proximity-match/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type CandidateRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  distance_m: number;
};

type MatchedRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  matched_at: string;
};

function normalizeRpcRows<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  return [data as T];
}

function mapCandidate(row: CandidateRow): ProximityMatchCandidate {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    distanceM: row.distance_m,
  };
}

function mapMatched(row: MatchedRow): ProximityMatchedUser {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    matchedAt: row.matched_at,
  };
}

export async function findNearbyProximityCandidate(
  latitude: number,
  longitude: number,
): Promise<ProximityMatchCandidate | null> {
  const { data, error } = await supabase.rpc('find_nearby_proximity_candidate', {
    p_latitude: latitude,
    p_longitude: longitude,
  });

  if (error) {
    console.warn('[proximity-match] find candidate:', error.message);
    return null;
  }

  const rows = normalizeRpcRows<CandidateRow>(data);
  if (rows.length === 0) return null;

  return mapCandidate(rows[0]);
}

export async function submitProximityMatchDecision(
  otherUserId: string,
  decision: 'yes' | 'no',
): Promise<ProximityMatchDecisionResult> {
  const { data, error } = await supabase.rpc('submit_proximity_match_decision', {
    p_other_user_id: otherUserId,
    p_decision: decision,
  });

  if (error) {
    throw new Error(supabaseErrorMessage(error)!);
  }

  const payload = data as { status?: ProximityMatchDecisionStatus; other_user_id?: string };
  return {
    status: payload.status ?? 'waiting',
    otherUserId: payload.other_user_id ?? otherUserId,
  };
}

export async function fetchProximityMatches(): Promise<ProximityMatchedUser[]> {
  const { data, error } = await supabase.rpc('list_proximity_matches');

  if (error || !data) return [];

  return (data as MatchedRow[]).map(mapMatched);
}

export async function fetchProximityMatchCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_proximity_matches');

  if (error || data == null) return 0;
  return Number(data) || 0;
}
