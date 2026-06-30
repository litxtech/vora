import type { WalletEarningsSummary } from '@/features/wallet/types';

export type WalletEarningsTotals = {
  ridesNetCents: number;
  hotelPendingCents: number;
  totalNetCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  activeSectorCount: number;
};

export function computeWalletEarningsTotals(summary: WalletEarningsSummary): WalletEarningsTotals {
  const hotelPendingCents = summary.hotelScheduledCents + summary.hotelEscrowCents;

  const sectors = [
    summary.marketplaceNetCents > 0 || summary.hasMarketplace,
    summary.ridesNetCents > 0 || summary.hasRides,
    summary.hotelNetCents > 0 || summary.hasHotel,
  ];

  return {
    ridesNetCents: summary.ridesNetCents,
    hotelPendingCents,
    totalNetCents: summary.marketplaceNetCents + summary.ridesNetCents + summary.hotelNetCents,
    totalPaidCents:
      summary.marketplacePaidCents + summary.ridesPaidCents + summary.hotelPaidCents,
    totalPendingCents:
      summary.marketplacePendingCents +
      summary.ridesPendingCents +
      summary.ridesScheduledCents +
      hotelPendingCents,
    activeSectorCount: sectors.filter(Boolean).length,
  };
}
