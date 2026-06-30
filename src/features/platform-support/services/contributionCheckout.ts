import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { openUrl } from '@/lib/linking/openUrl';
import type { PlatformSupportTier } from '@/features/platform-support/constants';
import type { PlatformContribution } from '@/features/platform-support/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function checkoutReturnUrl(result: 'success' | 'cancelled'): string {
  return Linking.createURL('settings/contribute', { queryParams: { checkout: result } });
}

export async function startPlatformSupportCheckout(
  tier: PlatformSupportTier,
): Promise<{ error: string | null }> {
  const successUrl = checkoutReturnUrl('success');
  const cancelUrl = checkoutReturnUrl('cancelled');

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-contribution-checkout',
    { body: { tier, successUrl, cancelUrl } },
  );

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası oluşturulamadı.' };

  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, successUrl);
    if (result.type === 'cancel') {
      return { error: null };
    }
  } catch {
    await openUrl(data.url);
  }

  return { error: null };
}

export async function fetchUserContributions(userId: string): Promise<PlatformContribution[]> {
  const { data } = await supabase
    .from('platform_contributions')
    .select('id, tier, amount_cents, currency, status, created_at, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    tier: row.tier as PlatformSupportTier,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status as PlatformContribution['status'],
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}
