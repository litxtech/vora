import type { JetonSummary, JetonTransaction } from '@/features/wallet/types';
import { supabase } from '@/lib/supabase/client';

type SummaryRow = {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  updated_at?: string;
};

type TxRow = {
  id: string;
  amount: number;
  balance_after: number;
  tx_type: string;
  source_type: string;
  source_key: string | null;
  note: string | null;
  created_at: string;
};

function mapSummary(raw: SummaryRow): JetonSummary {
  return {
    balance: Number(raw.balance ?? 0),
    lifetimeEarned: Number(raw.lifetime_earned ?? 0),
    lifetimeSpent: Number(raw.lifetime_spent ?? 0),
    updatedAt: raw.updated_at,
  };
}

function mapTransaction(row: TxRow): JetonTransaction {
  return {
    id: row.id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    txType: row.tx_type as JetonTransaction['txType'],
    sourceType: row.source_type as JetonTransaction['sourceType'],
    sourceKey: row.source_key,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function fetchJetonSummary(userId?: string): Promise<JetonSummary> {
  const { data, error } = await supabase.rpc('get_user_kuru_summary', {
    p_user_id: userId ?? undefined,
  });

  if (error || !data) {
    return { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
  }

  return mapSummary(data as SummaryRow);
}

export async function fetchJetonTransactions(
  userId?: string,
  limit = 50,
): Promise<JetonTransaction[]> {
  const { data, error } = await supabase.rpc('get_user_kuru_transactions', {
    p_user_id: userId ?? undefined,
    p_limit: limit,
    p_offset: 0,
  });

  if (error || !data?.length) {
    return [];
  }

  return (data as TxRow[]).map(mapTransaction);
}
