import { supabase } from '@/lib/supabase/client';
import { FRIEND_INVITE_POINTS } from '@/features/profile/constants';

export type FriendInviteStatus = {
  invite_code: string;
  has_redeemed: boolean;
  referral_reward_used: boolean;
};

export function normalizeFriendInviteCodeInput(code: string): string {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

export async function fetchOwnFriendInviteStatus(): Promise<FriendInviteStatus | null> {
  const { data, error } = await supabase.rpc('get_own_friend_invite_status');
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return row as FriendInviteStatus;
}

type RedeemResult =
  | { ok: true; points: number }
  | { ok: false; error: string };

export async function redeemFriendInviteCode(code: string): Promise<RedeemResult> {
  const normalized = normalizeFriendInviteCodeInput(code);
  if (normalized.length < 6) {
    return { ok: false, error: 'Geçersiz davet kodu' };
  }

  const { data, error } = await supabase.rpc('redeem_friend_invite_code', {
    p_code: normalized,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as { ok?: boolean; error?: string; points?: number } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? 'Davet kodu kullanılamadı' };
  }

  return { ok: true, points: result.points ?? FRIEND_INVITE_POINTS };
}
