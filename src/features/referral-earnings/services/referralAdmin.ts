import { supabase } from '@/lib/supabase/client';
import type {
  ReferralAdminDashboard,
  ReferralAdminDetail,
  ReferralAdminListRow,
  ReferralCommissionLog,
  ReferralCommissionStatus,
  ReferralFinanceSummary,
  ReferralSettings,
} from '@/features/referral-earnings/types';

type ListRow = {
  commission_id: string;
  inviter_id: string;
  inviter_username: string;
  invitee_id: string;
  invitee_username: string;
  amount_cents: number;
  status: ReferralAdminListRow['status'];
  suspicious: boolean;
  registered_at: string;
  earned_at: string | null;
  paid_at: string | null;
  invite_code: string;
};

function mapListRow(row: ListRow): ReferralAdminListRow {
  return {
    commissionId: row.commission_id,
    inviterId: row.inviter_id,
    inviterUsername: row.inviter_username,
    inviteeId: row.invitee_id,
    inviteeUsername: row.invitee_username,
    amountCents: row.amount_cents,
    status: row.status,
    suspicious: row.suspicious,
    registeredAt: row.registered_at,
    earnedAt: row.earned_at,
    paidAt: row.paid_at,
    inviteCode: row.invite_code,
  };
}

export async function fetchReferralAdminDashboard(): Promise<ReferralAdminDashboard | null> {
  const { data, error } = await supabase.rpc('referral_admin_dashboard');
  if (error || !data) return null;

  const raw = data as Record<string, number>;
  return {
    totalInvites: raw.total_invites ?? 0,
    totalCommissions: raw.total_commissions ?? 0,
    pendingCount: raw.pending_count ?? 0,
    reviewingCount: raw.reviewing_count ?? 0,
    earnedCount: raw.earned_count ?? 0,
    approvedCount: raw.approved_count ?? 0,
    paidCount: raw.paid_count ?? 0,
    cancelledCount: raw.cancelled_count ?? 0,
    rejectedCount: raw.rejected_count ?? 0,
    suspiciousCount: raw.suspicious_count ?? 0,
    totalLiabilityCents: raw.total_liability_cents ?? 0,
    totalPaidCents: raw.total_paid_cents ?? 0,
  };
}

export async function fetchReferralAdminList(
  status?: string | null,
  limit = 100,
): Promise<ReferralAdminListRow[]> {
  const { data, error } = await supabase.rpc('referral_admin_list', {
    p_status: status ?? null,
    p_limit: limit,
  });
  if (error || !data) return [];
  return (data as ListRow[]).map(mapListRow);
}

export async function fetchReferralAdminDetail(
  commissionId: string,
): Promise<ReferralAdminDetail | null> {
  const { data, error } = await supabase.rpc('referral_admin_detail', {
    p_commission_id: commissionId,
  });
  if (error || !data) return null;

  const raw = data as Record<string, unknown>;
  if (!raw.ok) return { ok: false };

  const commission = raw.commission as Record<string, unknown>;
  const inviter = raw.inviter as Record<string, unknown>;
  const invitee = raw.invitee as Record<string, unknown>;
  const metrics = raw.metrics as Record<string, unknown>;
  const logs = (raw.logs as Record<string, unknown>[] | undefined) ?? [];

  return {
    ok: true,
    commission: {
      id: commission.id as string,
      status: commission.status as ReferralCommissionStatus,
      amountCents: commission.amount_cents as number,
      suspicious: commission.suspicious as boolean,
      registeredAt: commission.registered_at as string,
      earnedAt: (commission.earned_at as string | null) ?? null,
      approvedAt: (commission.approved_at as string | null) ?? null,
      paidAt: (commission.paid_at as string | null) ?? null,
      note: (commission.note as string | null) ?? null,
    },
    inviter: {
      id: inviter.id as string,
      username: inviter.username as string,
      fullName: (inviter.full_name as string | null) ?? null,
      avatarUrl: (inviter.avatar_url as string | null) ?? null,
    },
    invitee: {
      id: invitee.id as string,
      username: invitee.username as string,
      fullName: (invitee.full_name as string | null) ?? null,
      avatarUrl: (invitee.avatar_url as string | null) ?? null,
      accountStatus: (invitee.account_status as string | null) ?? null,
      createdAt: invitee.created_at as string,
      lastSeenAt: (invitee.last_seen_at as string | null) ?? null,
      lastActiveAt: (invitee.last_active_at as string | null) ?? null,
    },
    inviteCode: raw.invite_code as string,
    metrics: {
      activeMinutes: metrics.active_minutes as number,
      sharesCount: metrics.shares_count as number,
      interactionsCount: metrics.interactions_count as number,
      firstLoginAt: (metrics.first_login_at as string | null) ?? null,
      lastLoginAt: (metrics.last_login_at as string | null) ?? null,
      violationsCount: metrics.violations_count as number,
      isSuspicious: metrics.is_suspicious as boolean,
    },
    evaluation: raw.evaluation as ReferralAdminDetail['evaluation'],
    logs: logs.map(
      (log): ReferralCommissionLog => ({
        id: log.id as string,
        actorId: (log.actor_id as string | null) ?? null,
        action: log.action as string,
        oldStatus: (log.old_status as ReferralCommissionLog['oldStatus']) ?? null,
        newStatus: (log.new_status as ReferralCommissionLog['newStatus']) ?? null,
        ip: (log.ip as string | null) ?? null,
        note: (log.note as string | null) ?? null,
        createdAt: log.created_at as string,
      }),
    ),
  };
}

export async function fetchReferralFinanceSummary(): Promise<ReferralFinanceSummary | null> {
  const { data, error } = await supabase.rpc('referral_finance_summary');
  if (error || !data) return null;

  const raw = data as Record<string, number>;
  return {
    notEarnedCents: raw.not_earned_cents ?? 0,
    earnedCents: raw.earned_cents ?? 0,
    approvedCents: raw.approved_cents ?? 0,
    paidCents: raw.paid_cents ?? 0,
    cancelledCents: raw.cancelled_cents ?? 0,
    rejectedCents: raw.rejected_cents ?? 0,
    totalLiabilityCents: raw.total_liability_cents ?? 0,
    totalPaidCents: raw.total_paid_cents ?? 0,
    totalPendingCents: raw.total_pending_cents ?? 0,
  };
}

export async function fetchReferralSettings(): Promise<ReferralSettings | null> {
  const { data, error } = await supabase.rpc('referral_admin_get_settings');
  if (error || !data) return null;

  const raw = data as Record<string, unknown>;
  return {
    campaignId: raw.campaign_id as string,
    campaignName: raw.campaign_name as string,
    rewardKind: raw.reward_kind as string,
    rewardAmountCents: raw.reward_amount_cents as number,
    minDays: raw.min_days as number,
    minActiveMinutes: raw.min_active_minutes as number,
    minShares: raw.min_shares as number,
    minInteractions: raw.min_interactions as number,
    minWithdrawCents: raw.min_withdraw_cents as number,
    autoApprove: raw.auto_approve as boolean,
    suspiciousCheck: raw.suspicious_check as boolean,
    requireAccountActive: raw.require_account_active as boolean,
    requireNoSpam: raw.require_no_spam as boolean,
  };
}

type AdminActionResult = { ok: true } | { ok: false; error: string };

async function runAdminRpc(
  fn: string,
  args: Record<string, unknown>,
): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.ok === false) return { ok: false, error: result.error ?? 'İşlem başarısız' };
  return { ok: true };
}

export function referralAdminApprove(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_approve', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminReject(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_reject', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminReview(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_review', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminCancel(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_cancel', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminManualGrant(
  commissionId: string,
  amountCents: number,
  note?: string,
) {
  return runAdminRpc('referral_admin_manual_grant', {
    p_commission_id: commissionId,
    p_amount_cents: amountCents,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminManualRemove(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_manual_remove', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminAddNote(commissionId: string, note: string) {
  return runAdminRpc('referral_admin_add_note', {
    p_commission_id: commissionId,
    p_note: note,
    p_ip: null,
  });
}

export function referralAdminMarkPaid(commissionId: string, note?: string) {
  return runAdminRpc('referral_admin_mark_paid', {
    p_commission_id: commissionId,
    p_note: note ?? null,
    p_ip: null,
  });
}

export function referralAdminBlacklistUser(userId: string, reason?: string) {
  return runAdminRpc('referral_admin_blacklist_user', {
    p_user_id: userId,
    p_reason: reason ?? null,
  });
}

export async function updateReferralSettings(
  payload: Partial<ReferralSettings> & { campaignId?: string },
): Promise<AdminActionResult> {
  return runAdminRpc('referral_admin_update_settings', {
    p_payload: {
      campaign_id: payload.campaignId,
      reward_amount_cents: payload.rewardAmountCents,
      min_days: payload.minDays,
      min_active_minutes: payload.minActiveMinutes,
      min_shares: payload.minShares,
      min_interactions: payload.minInteractions,
      min_withdraw_cents: payload.minWithdrawCents,
      auto_approve: payload.autoApprove,
      suspicious_check: payload.suspiciousCheck,
      require_account_active: payload.requireAccountActive,
      require_no_spam: payload.requireNoSpam,
    },
  });
}
