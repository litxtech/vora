import type { AdminJetonStats, AdminJetonTransaction, JetonSummary } from '@/features/wallet/types';
import { supabaseErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

type StatsRow = {
  total_balance: number;
  holders_count: number;
  credits_today: number;
  debits_today: number;
  transactions_today: number;
};

type AdminTxRow = {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  balance_after: number;
  tx_type: string;
  source_type: string;
  source_key: string | null;
  note: string | null;
  created_at: string;
};

export async function fetchAdminJetonStats(): Promise<{
  data: AdminJetonStats | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_kuru_stats');

  if (error) return { data: null, error: supabaseErrorMessage(error)! };

  const raw = (data ?? {}) as StatsRow;
  return {
    data: {
      totalBalance: Number(raw.total_balance ?? 0),
      holdersCount: Number(raw.holders_count ?? 0),
      creditsToday: Number(raw.credits_today ?? 0),
      debitsToday: Number(raw.debits_today ?? 0),
      transactionsToday: Number(raw.transactions_today ?? 0),
    },
    error: null,
  };
}

export async function fetchAdminJetonTransactions(limit = 50): Promise<AdminJetonTransaction[]> {
  const { data, error } = await supabase.rpc('admin_list_kuru_transactions', {
    p_limit: limit,
    p_offset: 0,
  });

  if (error || !data?.length) {
    return [];
  }

  return (data as AdminTxRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    amount: row.amount,
    balanceAfter: row.balance_after,
    txType: row.tx_type as AdminJetonTransaction['txType'],
    sourceType: row.source_type as AdminJetonTransaction['sourceType'],
    sourceKey: row.source_key,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function adminAdjustJeton(
  userId: string,
  amount: number,
  note?: string,
): Promise<{ ok: boolean; balance: number | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_adjust_kuru', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note ?? null,
  });

  if (error) {
    return { ok: false, balance: null, error: supabaseErrorMessage(error)! };
  }

  const raw = (data ?? {}) as { balance: number };
  return { ok: true, balance: Number(raw.balance ?? 0), error: null };
}

export async function fetchAdminUserJeton(userId: string): Promise<{
  summary: JetonSummary;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_get_user_kuru', {
    p_user_id: userId,
  });

  if (error || !data) {
    return {
      summary: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      error: supabaseErrorMessage(error),
    };
  }

  const raw = data as {
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  };

  return {
    summary: {
      balance: Number(raw.balance ?? 0),
      lifetimeEarned: Number(raw.lifetime_earned ?? 0),
      lifetimeSpent: Number(raw.lifetime_spent ?? 0),
    },
    error: null,
  };
}
