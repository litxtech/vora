import { computeSellerEarningsSummary } from '@/features/marketplace/services/sellerEarnings';
import { fetchSellerSales } from '@/features/marketplace/services/sellerSalesData';
import { fetchHotelOwnerEarnings } from '@/features/hotel-center/services/ownerEarnings';
import { fetchDriverEarnings } from '@/features/rides/services/earningsData';
import type { WalletEarningsSummary } from '@/features/wallet/types';

export async function fetchWalletEarningsSummary(userId: string): Promise<WalletEarningsSummary> {
  const [sellerSales, driverEarnings, hotelEarnings] = await Promise.all([
    fetchSellerSales(userId).catch(() => []),
    fetchDriverEarnings(userId).catch(() => ({
      totalPaidCents: 0,
      pendingPayoutCents: 0,
      scheduledPayoutCents: 0,
      rows: [],
    })),
    fetchHotelOwnerEarnings(userId).catch(() => ({
      reservationCount: 0,
      grossCents: 0,
      commissionCents: 0,
      netCents: 0,
      totalPaidCents: 0,
      scheduledPayoutCents: 0,
      pendingEscrowCents: 0,
      rows: [],
    })),
  ]);

  const marketplace = computeSellerEarningsSummary(sellerSales);

  const ridesNetCents =
    driverEarnings.totalPaidCents +
    driverEarnings.pendingPayoutCents +
    driverEarnings.scheduledPayoutCents;

  return {
    marketplaceNetCents: marketplace.netCents,
    marketplacePaidCents: marketplace.paidOutCents,
    marketplacePendingCents: marketplace.pendingPayoutCents,
    marketplaceSaleCount: marketplace.saleCount,
    ridesNetCents,
    ridesPaidCents: driverEarnings.totalPaidCents,
    ridesPendingCents: driverEarnings.pendingPayoutCents,
    ridesScheduledCents: driverEarnings.scheduledPayoutCents,
    ridesTripCount: driverEarnings.rows.length,
    hotelNetCents: hotelEarnings.netCents,
    hotelPaidCents: hotelEarnings.totalPaidCents,
    hotelScheduledCents: hotelEarnings.scheduledPayoutCents,
    hotelEscrowCents: hotelEarnings.pendingEscrowCents,
    hotelReservationCount: hotelEarnings.reservationCount,
    hasMarketplace: marketplace.saleCount > 0,
    hasRides: driverEarnings.rows.length > 0,
    hasHotel: hotelEarnings.reservationCount > 0,
  };
}
