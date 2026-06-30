import { PLATFORM_SUPPORT_PACKAGES } from '@/features/platform-support/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminContributionRow = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  tier: string;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

const TIER_LABELS = Object.fromEntries(
  PLATFORM_SUPPORT_PACKAGES.map((pkg) => [pkg.id, pkg.label]),
) as Record<string, string>;

export function contributionTierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

export async function fetchAdminContributions(limit = 50): Promise<AdminContributionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_platform_contributions', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminContributionRow[];
}

export async function revokePlatformSupporter(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_platform_supporter', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}
