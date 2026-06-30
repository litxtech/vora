export type TrustScoreSummary = {
  balance: number;
  maxScore: number;
  lifetimeEarned: number;
  lifetimeLost: number;
};

export type TrustLedgerEntry = {
  id: string;
  delta: number;
  appliedDelta: number;
  sourceType: string;
  sourceId: string | null;
  scoreBefore: number;
  scoreAfter: number;
  note: string | null;
  createdAt: string;
};

export type WalletEarningsSummary = {
  marketplaceNetCents: number;
  marketplacePaidCents: number;
  marketplacePendingCents: number;
  marketplaceSaleCount: number;
  ridesNetCents: number;
  ridesPaidCents: number;
  ridesPendingCents: number;
  ridesScheduledCents: number;
  ridesTripCount: number;
  hotelNetCents: number;
  hotelPaidCents: number;
  hotelScheduledCents: number;
  hotelEscrowCents: number;
  hotelReservationCount: number;
  hasMarketplace: boolean;
  hasRides: boolean;
  hasHotel: boolean;
};

export type WalletTab = 'points' | 'earnings';

export type WalletActivitySector = 'points' | 'marketplace' | 'rides' | 'hotel' | 'ads' | 'hizmetler';

export type WalletActivityStatus = 'completed' | 'pending' | 'scheduled';

export type WalletActivityItem = {
  id: string;
  sector: WalletActivitySector;
  status: WalletActivityStatus;
  title: string;
  subtitle: string;
  amountCents?: number;
  pointsAmount?: number;
  currency: 'try' | 'points';
  occurredAt: string;
  details: WalletActivityDetailField[];
};

export type WalletActivityDetailField = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export type WalletActivityFilter = 'all' | 'points' | 'try';

export type JetonTransactionType =
  | 'task_reward'
  | 'admin_credit'
  | 'admin_debit'
  | 'spend'
  | 'bonus'
  | 'transfer_in'
  | 'transfer_out';

export type JetonSourceType =
  | 'daily_task'
  | 'admin'
  | 'profile_boost'
  | 'deal_redeem'
  | 'tip'
  | 'signup_bonus'
  | 'other';

export type JetonSummary = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt?: string;
};

export type JetonTransaction = {
  id: string;
  amount: number;
  balanceAfter: number;
  txType: JetonTransactionType;
  sourceType: JetonSourceType;
  sourceKey: string | null;
  note: string | null;
  createdAt: string;
};

export type AdminJetonStats = {
  totalBalance: number;
  holdersCount: number;
  creditsToday: number;
  debitsToday: number;
  transactionsToday: number;
};

export type AdminJetonTransaction = JetonTransaction & {
  userId: string;
  username: string;
};
