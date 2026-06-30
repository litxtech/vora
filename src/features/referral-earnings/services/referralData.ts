import { supabase } from '@/lib/supabase/client';
import type {
  ReferralInviteeProgress,
  ReferralInviteeRow,
  ReferralUserSummary,
  ReferralWalletSummary,
} from '@/features/referral-earnings/types';

type InviteeRow = {
  commission_id: string;
  invitee_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  registered_at: string;
  status: ReferralInviteeRow['status'];
  amount_cents: number;
  membership_days: number;
  active_minutes: number;
  shares_count: number;
  interactions_count: number;
  min_days: number;
  min_active_minutes: number;
  min_shares: number;
  min_interactions: number;
  progress_percent: number;
};

function mapInviteeRow(row: InviteeRow): ReferralInviteeRow {
  return {
    commissionId: row.commission_id,
    inviteeId: row.invitee_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    registeredAt: row.registered_at,
    status: row.status,
    amountCents: row.amount_cents,
    membershipDays: row.membership_days,
    activeMinutes: row.active_minutes,
    sharesCount: row.shares_count,
    interactionsCount: row.interactions_count,
    minDays: row.min_days,
    minActiveMinutes: row.min_active_minutes,
    minShares: row.min_shares,
    minInteractions: row.min_interactions,
    progressPercent: row.progress_percent,
  };
}

export async function fetchReferralUserSummary(): Promise<ReferralUserSummary | null> {
  const { data, error } = await supabase.rpc('referral_user_summary');
  if (error || !data) return null;

  const raw = data as Record<string, unknown>;
  return {
    inviteCode: (raw.invite_code as string | null) ?? null,
    rewardAmountCents: (raw.reward_amount_cents as number) ?? 0,
    minDays: (raw.min_days as number) ?? 0,
    minActiveMinutes: (raw.min_active_minutes as number) ?? 0,
    minShares: (raw.min_shares as number) ?? 0,
    minInteractions: (raw.min_interactions as number) ?? 0,
    totalInvites: (raw.total_invites as number) ?? 0,
    pendingCount: (raw.pending_count as number) ?? 0,
    earnedCount: (raw.earned_count as number) ?? 0,
    approvedCount: (raw.approved_count as number) ?? 0,
    paidCount: (raw.paid_count as number) ?? 0,
    rejectedCount: (raw.rejected_count as number) ?? 0,
    totalEarnedCents: (raw.total_earned_cents as number) ?? 0,
    totalPaidCents: (raw.total_paid_cents as number) ?? 0,
    pendingEarningsCents: (raw.pending_earnings_cents as number) ?? 0,
    approvedEarningsCents: (raw.approved_earnings_cents as number) ?? 0,
    hasRelationshipAsInvitee: Boolean(raw.has_relationship_as_invitee),
  };
}

export async function fetchReferralInvitees(): Promise<ReferralInviteeRow[]> {
  const { data, error } = await supabase.rpc('referral_list_invitees');
  if (error || !data) return [];
  return (data as InviteeRow[]).map(mapInviteeRow);
}

export async function fetchReferralInviteeProgress(): Promise<ReferralInviteeProgress> {
  const { data, error } = await supabase.rpc('referral_invitee_progress');
  if (error || !data) return { hasInviter: false };

  const raw = data as Record<string, unknown>;
  if (!raw.has_inviter) return { hasInviter: false };

  return {
    hasInviter: true,
    inviterId: raw.inviter_id as string,
    inviterUsername: raw.inviter_username as string,
    inviterFullName: (raw.inviter_full_name as string | null) ?? null,
    inviterAvatar: (raw.inviter_avatar as string | null) ?? null,
    inviteCode: raw.invite_code as string,
    registeredAt: raw.registered_at as string,
    commissionStatus: raw.commission_status as ReferralInviteeProgress['commissionStatus'],
    settings: raw.settings as ReferralInviteeProgress['settings'],
    evaluation: raw.evaluation as ReferralInviteeProgress['evaluation'],
    progressPercent: raw.progress_percent as number,
  };
}

export async function establishReferralRelationship(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('referral_establish_relationship', { p_code: code });
  if (error) return { ok: false, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Davet kodu kullanılamadı' };
  return { ok: true };
}

export async function fetchReferralWalletSummary(): Promise<ReferralWalletSummary | null> {
  const { data, error } = await supabase.rpc('referral_wallet_summary');
  if (error || !data) return null;

  const raw = data as Record<string, number>;
  return {
    pendingEarningsCents: raw.pending_earnings_cents ?? 0,
    approvedEarningsCents: raw.approved_earnings_cents ?? 0,
    withdrawableCents: raw.withdrawable_cents ?? 0,
    paidCents: raw.paid_cents ?? 0,
    minWithdrawCents: raw.min_withdraw_cents ?? 0,
  };
}

export async function requestReferralPayout(
  amountCents: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('referral_request_payout', {
    p_amount_cents: amountCents,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Çekim talebi oluşturulamadı' };
  return { ok: true };
}
