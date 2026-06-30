import { TRUST_SCORE_DEFAULT, TRUST_SCORE_MAX } from '@/features/profile/constants';
import type { TrustLedgerEntry, TrustScoreSummary } from '@/features/wallet/types';
import { supabase } from '@/lib/supabase/client';

type LedgerRow = {
  id: string;
  delta: number;
  applied_delta: number;
  source_type: string;
  source_id: string | null;
  score_before: number;
  score_after: number;
  note: string | null;
  created_at: string;
};

function mapLedger(row: LedgerRow): TrustLedgerEntry {
  return {
    id: row.id,
    delta: Number(row.delta ?? 0),
    appliedDelta: Number(row.applied_delta ?? 0),
    sourceType: row.source_type,
    sourceId: row.source_id,
    scoreBefore: Number(row.score_before ?? 0),
    scoreAfter: Number(row.score_after ?? 0),
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function fetchTrustScoreSummary(userId: string): Promise<TrustScoreSummary> {
  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('trust_score').eq('id', userId).maybeSingle(),
    supabase
      .from('trust_score_ledger')
      .select('applied_delta')
      .eq('user_id', userId),
  ]);

  let lifetimeEarned = 0;
  let lifetimeLost = 0;
  for (const row of ledger ?? []) {
    const applied = Number((row as { applied_delta?: number }).applied_delta ?? 0);
    if (applied > 0) lifetimeEarned += applied;
    if (applied < 0) lifetimeLost += Math.abs(applied);
  }

  return {
    balance: Number(profile?.trust_score ?? TRUST_SCORE_DEFAULT),
    maxScore: TRUST_SCORE_MAX,
    lifetimeEarned,
    lifetimeLost,
  };
}

export async function fetchTrustLedger(userId: string, limit = 50): Promise<TrustLedgerEntry[]> {
  const { data, error } = await supabase
    .from('trust_score_ledger')
    .select(
      'id, delta, applied_delta, source_type, source_id, score_before, score_after, note, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  return (data as LedgerRow[]).map(mapLedger);
}
