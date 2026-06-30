export type ReferralCommissionStatus =
  | 'pending'
  | 'in_progress'
  | 'reviewing'
  | 'earned'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type ReferralUserSummary = {
  inviteCode: string | null;
  rewardAmountCents: number;
  minDays: number;
  minActiveMinutes: number;
  minShares: number;
  minInteractions: number;
  totalInvites: number;
  pendingCount: number;
  earnedCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  pendingEarningsCents: number;
  approvedEarningsCents: number;
  hasRelationshipAsInvitee: boolean;
};

export type ReferralInviteeRow = {
  commissionId: string;
  inviteeId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  registeredAt: string;
  status: ReferralCommissionStatus;
  amountCents: number;
  membershipDays: number;
  activeMinutes: number;
  sharesCount: number;
  interactionsCount: number;
  minDays: number;
  minActiveMinutes: number;
  minShares: number;
  minInteractions: number;
  progressPercent: number;
};

export type ReferralInviteeProgress = {
  hasInviter: boolean;
  inviterId?: string;
  inviterUsername?: string;
  inviterFullName?: string | null;
  inviterAvatar?: string | null;
  inviteCode?: string;
  registeredAt?: string;
  commissionStatus?: ReferralCommissionStatus;
  settings?: {
    minDays: number;
    minActiveMinutes: number;
    minShares: number;
    minInteractions: number;
  };
  evaluation?: {
    eligible?: boolean;
    suspicious?: boolean;
    daysMet?: boolean;
    minutesMet?: boolean;
    sharesMet?: boolean;
    interactionsMet?: boolean;
    accountOk?: boolean;
    spamOk?: boolean;
    membershipDays?: number;
    activeMinutes?: number;
    sharesCount?: number;
    interactionsCount?: number;
  };
  progressPercent?: number;
};

export type ReferralWalletSummary = {
  pendingEarningsCents: number;
  approvedEarningsCents: number;
  withdrawableCents: number;
  paidCents: number;
  minWithdrawCents: number;
};

export type ReferralAdminDashboard = {
  totalInvites: number;
  totalCommissions: number;
  pendingCount: number;
  reviewingCount: number;
  earnedCount: number;
  approvedCount: number;
  paidCount: number;
  cancelledCount: number;
  rejectedCount: number;
  suspiciousCount: number;
  totalLiabilityCents: number;
  totalPaidCents: number;
};

export type ReferralAdminListRow = {
  commissionId: string;
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
  inviteeUsername: string;
  amountCents: number;
  status: ReferralCommissionStatus;
  suspicious: boolean;
  registeredAt: string;
  earnedAt: string | null;
  paidAt: string | null;
  inviteCode: string;
};

export type ReferralCommissionLog = {
  id: string;
  actorId: string | null;
  action: string;
  oldStatus: ReferralCommissionStatus | null;
  newStatus: ReferralCommissionStatus | null;
  ip: string | null;
  note: string | null;
  createdAt: string;
};

export type ReferralAdminDetail = {
  ok: boolean;
  commission?: {
    id: string;
    status: ReferralCommissionStatus;
    amountCents: number;
    suspicious: boolean;
    registeredAt: string;
    earnedAt: string | null;
    approvedAt: string | null;
    paidAt: string | null;
    note: string | null;
  };
  inviter?: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  invitee?: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    accountStatus: string | null;
    createdAt: string;
    lastSeenAt: string | null;
    lastActiveAt: string | null;
  };
  inviteCode?: string;
  metrics?: {
    activeMinutes: number;
    sharesCount: number;
    interactionsCount: number;
    firstLoginAt: string | null;
    lastLoginAt: string | null;
    violationsCount: number;
    isSuspicious: boolean;
  };
  evaluation?: ReferralInviteeProgress['evaluation'];
  logs?: ReferralCommissionLog[];
};

export type ReferralFinanceSummary = {
  notEarnedCents: number;
  earnedCents: number;
  approvedCents: number;
  paidCents: number;
  cancelledCents: number;
  rejectedCents: number;
  totalLiabilityCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
};

export type ReferralSettings = {
  campaignId: string;
  campaignName: string;
  rewardKind: string;
  rewardAmountCents: number;
  minDays: number;
  minActiveMinutes: number;
  minShares: number;
  minInteractions: number;
  minWithdrawCents: number;
  autoApprove: boolean;
  suspiciousCheck: boolean;
  requireAccountActive: boolean;
  requireNoSpam: boolean;
};
