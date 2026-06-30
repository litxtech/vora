import type { PlatformSupportTier } from '@/features/platform-support/constants';

export type PlatformContribution = {
  id: string;
  tier: PlatformSupportTier;
  amountCents: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
};
