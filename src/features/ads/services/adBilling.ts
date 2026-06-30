import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { openUrl } from '@/lib/linking/openUrl';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function topupReturnUrl(result: 'success' | 'cancelled'): string {
  return Linking.createURL('ads', { queryParams: { topup: result } });
}

/** Stripe oturum URL'si oluşturur. */
export async function createAdWalletTopupSession(
  amountCents: number,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-ad-wallet-topup',
    {
      body: {
        amountCents,
        successUrl: topupReturnUrl('success'),
        cancelUrl: topupReturnUrl('cancelled'),
      },
    },
  );

  if (error) return { url: null, error: supabaseErrorMessage(error)! };
  if (data?.error) return { url: null, error: data.error };
  if (!data?.url) return { url: null, error: 'Ödeme sayfası açılamadı.' };

  return { url: data.url, error: null };
}

/** Stripe Checkout — uygulama içi tarayıcı (Auth Session). */
export async function startAdWalletTopup(amountCents: number): Promise<{ error: string | null }> {
  const successUrl = topupReturnUrl('success');
  const { url, error } = await createAdWalletTopupSession(amountCents);
  if (error || !url) return { error: error ?? 'Ödeme sayfası açılamadı.' };

  try {
    await WebBrowser.openAuthSessionAsync(url, successUrl);
  } catch {
    await openUrl(url);
  }

  return { error: null };
}

export function formatWalletBalance(cents: number): string {
  return `₺${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDebt(cents: number): string {
  return formatWalletBalance(cents);
}

export function estimateClicks(budgetCents: number, cpcCents: number): number {
  if (cpcCents <= 0) return 0;
  return Math.floor(budgetCents / cpcCents);
}
