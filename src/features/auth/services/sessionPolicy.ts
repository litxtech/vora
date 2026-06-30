import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type SessionEndReason = 'manual' | 'ban' | 'deletion' | 'frozen' | 'deleted';

const SIGNOUT_REASON_KEY = 'auth.signout.reason';
const SKIP_AUTO_GUEST_KEY = 'auth.skip_auto_guest';

export async function markSignOutReason(reason: SessionEndReason): Promise<void> {
  await SecureStore.setItemAsync(SIGNOUT_REASON_KEY, reason);
}

/** Çıkış sonrası cold start'ta otomatik misafir girişini engeller. */
export async function markSkipAutoGuest(): Promise<void> {
  await SecureStore.setItemAsync(SKIP_AUTO_GUEST_KEY, '1');
}

export async function peekSkipAutoGuest(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SKIP_AUTO_GUEST_KEY)) === '1';
}

export async function clearSkipAutoGuest(): Promise<void> {
  await SecureStore.deleteItemAsync(SKIP_AUTO_GUEST_KEY);
}

export async function consumeSignOutReason(): Promise<SessionEndReason | null> {
  const reason = await SecureStore.getItemAsync(SIGNOUT_REASON_KEY);
  if (reason) {
    await SecureStore.deleteItemAsync(SIGNOUT_REASON_KEY);
  }
  if (
    reason === 'manual' ||
    reason === 'ban' ||
    reason === 'deletion' ||
    reason === 'frozen' ||
    reason === 'deleted'
  ) {
    return reason;
  }
  return null;
}

export async function peekSignOutReason(): Promise<SessionEndReason | null> {
  const reason = await SecureStore.getItemAsync(SIGNOUT_REASON_KEY);
  if (
    reason === 'manual' ||
    reason === 'ban' ||
    reason === 'deletion' ||
    reason === 'frozen' ||
    reason === 'deleted'
  ) {
    return reason;
  }
  return null;
}

export async function hasActiveBan(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_bans')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (error || !data?.length) return false;

  const ban = data[0];
  if (!ban.expires_at) return true;
  return new Date(ban.expires_at).getTime() > Date.now();
}

export async function resolveForcedSignOutReason(
  userId: string,
  profile: Profile | null,
): Promise<SessionEndReason | null> {
  if (profile?.account_status === 'deleted') return 'deleted';
  if (profile?.account_status === 'quarantined' || profile?.account_status === 'frozen') return 'frozen';
  if (await hasActiveBan(userId)) return 'ban';
  return null;
}

export function sessionEndMessage(reason: SessionEndReason): string {
  switch (reason) {
    case 'ban':
      return 'Hesabınız askıya alındı veya banlandı. Oturumunuz sonlandırıldı.';
    case 'frozen':
      return 'Hesabınız donduruldu. Oturumunuz sonlandırıldı.';
    case 'deletion':
      return 'Hesap silme talebiniz alındı. 7 gün içinde tüm verileriniz kalıcı olarak silinecektir. Bu süre içinde giriş yaparak iptal edebilirsiniz.';
    case 'deleted':
      return 'Bu hesap silinmiştir. Oturumunuz sonlandırıldı.';
    default:
      return 'Oturumunuz sonlandırıldı.';
  }
}
