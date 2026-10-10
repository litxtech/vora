import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { AiMusicPackageId } from '@/features/ai-music/constants';
import type { AiMusicAdminAccount, AiMusicBalance, AiMusicGrant } from '@/features/ai-music/types';
import { edgeFunctionErrorMessage, supabaseErrorMessage } from '@/lib/errors';
import { openUrl } from '@/lib/linking/openUrl';
import { supabase } from '@/lib/supabase/client';

type BalanceRow = {
  granted_sec?: number;
  reserved_sec?: number;
  spent_sec?: number;
  available_sec?: number;
  user_id?: string;
  username?: string | null;
  full_name?: string | null;
  grants?: Array<{
    seconds?: number;
    source?: string;
    package_id?: string | null;
    amount_minor?: number | null;
    note?: string | null;
    created_at?: string;
  }>;
};

function mapBalance(row: BalanceRow | null | undefined): AiMusicBalance | null {
  if (!row) return null;
  return {
    grantedSec: Number(row.granted_sec ?? 0),
    reservedSec: Number(row.reserved_sec ?? 0),
    spentSec: Number(row.spent_sec ?? 0),
    availableSec: Number(row.available_sec ?? 0),
  };
}

function mapGrant(row: NonNullable<BalanceRow['grants']>[number]): AiMusicGrant {
  const source = row.source === 'purchase' || row.source === 'admin' ? row.source : 'free';
  return {
    seconds: Number(row.seconds ?? 0),
    source,
    packageId: row.package_id ?? null,
    amountMinor: row.amount_minor == null ? null : Number(row.amount_minor),
    note: row.note ?? null,
    createdAt: row.created_at ?? '',
  };
}

function mapAdminAccount(row: BalanceRow | null | undefined): AiMusicAdminAccount | null {
  const balance = mapBalance(row);
  if (!balance || !row?.user_id) return null;
  return {
    ...balance,
    userId: row.user_id,
    username: row.username ?? null,
    fullName: row.full_name ?? null,
    grants: (row.grants ?? []).map(mapGrant),
  };
}

function packageReturnUrl(result: 'success' | 'cancelled'): string {
  const base = Linking.createURL('sounds/ai/packages');
  const join = base.includes('?') ? '&' : '?';
  if (result === 'cancelled') return `${base}${join}checkout=cancelled`;
  return `${base}${join}checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}

export async function fetchAiMusicBalance(): Promise<AiMusicBalance | null> {
  const { data, error } = await supabase.rpc('get_ai_music_balance');
  if (error || !data) return null;
  return mapBalance(data as BalanceRow);
}

export async function buyAiMusicPackage(
  packageId: AiMusicPackageId,
): Promise<{ credited: boolean; balance: AiMusicBalance | null; error: string | null }> {
  const successUrl = packageReturnUrl('success');
  const cancelUrl = packageReturnUrl('cancelled');
  const { data, error } = await supabase.functions.invoke<{ url?: string; sessionId?: string; error?: string }>(
    'stripe-create-ai-music-checkout',
    { body: { packageId, successUrl, cancelUrl } },
  );
  if (error) return { credited: false, balance: null, error: await edgeFunctionErrorMessage(error, data) };
  if (data?.error) return { credited: false, balance: null, error: data.error };
  if (!data?.url || !data.sessionId) {
    return { credited: false, balance: null, error: 'Ödeme sayfası oluşturulamadı.' };
  }

  try {
    await WebBrowser.openAuthSessionAsync(data.url, successUrl);
  } catch {
    await openUrl(data.url);
  }

  return confirmAiMusicCheckout(data.sessionId);
}

export async function confirmAiMusicCheckout(
  sessionId: string,
): Promise<{ credited: boolean; balance: AiMusicBalance | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{
    credited?: boolean;
    balance?: BalanceRow | null;
    error?: string;
  }>('stripe-confirm-ai-music-checkout', { body: { sessionId } });
  if (error) return { credited: false, balance: null, error: await edgeFunctionErrorMessage(error, data) };
  if (data?.error) return { credited: false, balance: null, error: data.error };
  return {
    credited: data?.credited === true,
    balance: mapBalance(data?.balance),
    error: null,
  };
}

export async function fetchAdminAiMusicAccount(userId: string): Promise<{
  account: AiMusicAdminAccount | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_get_ai_music_balance', { p_user_id: userId });
  if (error) return { account: null, error: supabaseErrorMessage(error) };
  return { account: mapAdminAccount(data as BalanceRow), error: null };
}

export async function grantAdminAiMusicMinutes(
  userId: string,
  minutes: number,
  note: string,
): Promise<{ account: AiMusicAdminAccount | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_grant_ai_music_minutes', {
    p_user_id: userId,
    p_minutes: minutes,
    p_note: note.trim() || null,
  });
  if (error) return { account: null, error: supabaseErrorMessage(error) };
  return { account: mapAdminAccount(data as BalanceRow), error: null };
}
