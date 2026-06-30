import type { TrustLedgerEntry } from '@/features/wallet/types';
import { supabaseErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

export type AdminTrustAdjustAction = 'set' | 'add' | 'reset';

export type AdminTrustAdjustResult = {
  userId: string;
  ledgerId?: string;
  oldScore: number;
  newScore: number;
  appliedDelta: number;
  note?: string;
  unchanged?: boolean;
};

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

export async function adminAdjustUserTrustScore(
  userId: string,
  action: AdminTrustAdjustAction,
  value: number | null,
  reason: string,
): Promise<{ data: AdminTrustAdjustResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_adjust_user_trust_score', {
    p_user_id: userId,
    p_action: action,
    p_value: value ?? undefined,
    p_reason: reason,
  });

  if (error) return { data: null, error: supabaseErrorMessage(error)! };

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    data: {
      userId: String(raw.user_id ?? userId),
      ledgerId: raw.ledger_id ? String(raw.ledger_id) : undefined,
      oldScore: Number(raw.old_score ?? 0),
      newScore: Number(raw.new_score ?? 0),
      appliedDelta: Number(raw.applied_delta ?? 0),
      note: typeof raw.note === 'string' ? raw.note : undefined,
      unchanged: Boolean(raw.unchanged),
    },
    error: null,
  };
}

export async function adminSetUserContributionScore(
  userId: string,
  value: number,
  reason: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc('admin_set_user_contribution_score', {
    p_user_id: userId,
    p_value: value,
    p_reason: reason,
  });

  if (error) return { ok: false, error: supabaseErrorMessage(error)! };
  return { ok: true, error: null };
}

export async function fetchAdminUserTrustLedger(
  userId: string,
  limit = 20,
): Promise<{ data: TrustLedgerEntry[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_get_user_trust_ledger', {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data as LedgerRow[]).map(mapLedger), error: null };
}
