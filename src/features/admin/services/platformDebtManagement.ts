import type { PlatformDebtRow } from '@/features/ads/types';
import { supabase } from '@/lib/supabase/client';

type DebtRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  platform_debt_cents: number;
  has_card_on_file: boolean;
  updated_at: string;
};

export async function fetchPlatformDebts(limit = 50): Promise<PlatformDebtRow[]> {
  const { data, error } = await supabase.rpc('admin_list_platform_debts', { p_limit: limit });

  if (error || !data) return [];

  return (data as DebtRow[]).map((row) => ({
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    platformDebtCents: row.platform_debt_cents,
    hasCardOnFile: row.has_card_on_file,
    updatedAt: row.updated_at,
  }));
}
