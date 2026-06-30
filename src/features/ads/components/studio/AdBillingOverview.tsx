import type { AdWalletSummary } from '@/features/ads/types';
import { AdWalletTopupPanel } from '@/features/ads/components/AdWalletTopupPanel';

type AdBillingOverviewProps = {
  wallet: AdWalletSummary;
  compact?: boolean;
};

/** @deprecated AdWalletTopupPanel kullanın */
export function AdBillingOverview({ wallet, compact = false }: AdBillingOverviewProps) {
  return <AdWalletTopupPanel wallet={wallet} variant={compact ? 'compact' : 'full'} />;
}
