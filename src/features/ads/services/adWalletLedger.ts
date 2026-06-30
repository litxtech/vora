import type { AdWalletEntryType, AdWalletLedgerEntry } from '@/features/ads/types';
import { supabase } from '@/lib/supabase/client';

type LedgerRow = {
  id: string;
  amount_cents: number;
  balance_after: number;
  entry_type: string;
  ad_id: string | null;
  note: string | null;
  created_at: string;
  business_ads: { title: string } | { title: string }[] | null;
};

function mapEntry(row: LedgerRow): AdWalletLedgerEntry {
  const adJoin = row.business_ads;
  const adTitle = Array.isArray(adJoin) ? adJoin[0]?.title ?? null : adJoin?.title ?? null;

  const entryType = row.entry_type as AdWalletEntryType;

  return {
    id: row.id,
    amountCents: row.amount_cents,
    balanceAfterCents: row.balance_after,
    entryType:
      entryType === 'topup' ||
      entryType === 'ad_click' ||
      entryType === 'admin_adjustment' ||
      entryType === 'refund'
        ? entryType
        : 'admin_adjustment',
    adId: row.ad_id,
    adTitle,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function fetchAdWalletLedger(limit = 30): Promise<AdWalletLedgerEntry[]> {
  const { data, error } = await supabase
    .from('ad_wallet_ledger')
    .select(
      `
      id,
      amount_cents,
      balance_after,
      entry_type,
      ad_id,
      note,
      created_at,
      business_ads ( title )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as LedgerRow[]).map(mapEntry);
}
