import type { AdWalletSummary } from '@/features/ads/types';
import { AD_CPC_CENTS, MIN_AD_BUDGET_CENTS, MIN_AD_TOPUP_CENTS } from '@/features/ads/constants';
import { supabase } from '@/lib/supabase/client';

export async function fetchAdWalletSummary(): Promise<AdWalletSummary> {
  const { data, error } = await supabase.rpc('get_ad_wallet_summary');

  if (error || !data || typeof data !== 'object') {
    return emptyWallet();
  }

  return mapWallet(data as Record<string, unknown>);
}

function mapWallet(payload: Record<string, unknown>): AdWalletSummary {
  return {
    balanceCents: Number(payload.balance_cents) || 0,
    cpcCents: Number(payload.cpc_cents) || AD_CPC_CENTS,
    minBudgetCents: Number(payload.min_budget_cents) || MIN_AD_BUDGET_CENTS,
    minTopupCents: Number(payload.min_topup_cents) || MIN_AD_TOPUP_CENTS,
  };
}

function emptyWallet(): AdWalletSummary {
  return {
    balanceCents: 0,
    cpcCents: AD_CPC_CENTS,
    minBudgetCents: MIN_AD_BUDGET_CENTS,
    minTopupCents: MIN_AD_TOPUP_CENTS,
  };
}
