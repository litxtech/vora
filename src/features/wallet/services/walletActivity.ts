import { fetchAdWalletLedger } from '@/features/ads/services/adWalletLedger';
import { fetchSellerSales } from '@/features/marketplace/services/sellerSalesData';
import { fetchHotelOwnerEarnings } from '@/features/hotel-center/services/ownerEarnings';
import { fetchDriverEarnings } from '@/features/rides/services/earningsData';
import { fetchProviderByUserId } from '@/features/vora-hizmetler/services/providerData';
import {
  fetchUserHizmetWalletPayments,
  hizmetPaymentWalletStatus,
} from '@/features/vora-hizmetler/services/paymentData';
import { fetchTrustLedger } from '@/features/wallet/services/trustScoreData';
import type { WalletActivityItem } from '@/features/wallet/types';
import {
  adWalletActivityDetails,
  adWalletActivityFromEntry,
  hizmetActivityDetails,
  hizmetActivityFromRow,
  describeTrustLedgerEntry,
  hotelActivityDetails,
  hotelActivityFromRow,
  marketplaceActivityDetails,
  marketplaceActivityFromSale,
  ridesActivityDetails,
  ridesActivityFromRow,
  trustLedgerActivityDetails,
} from '@/features/wallet/utils/activityLabels';

export async function fetchWalletActivity(userId: string, limit = 50): Promise<WalletActivityItem[]> {
  const providerRes = await fetchProviderByUserId(userId).catch(() => ({ provider: null as null }));

  const [ledger, sellerSales, driverEarnings, hotelEarnings, adWalletEntries, hizmetPayments] =
    await Promise.all([
    fetchTrustLedger(userId, limit).catch(() => []),
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
    fetchAdWalletLedger(limit).catch(() => []),
    fetchUserHizmetWalletPayments(userId, providerRes.provider?.id ?? null, limit).catch(() => []),
  ]);

  const items: WalletActivityItem[] = [];

  for (const entry of ledger) {
    const copy = describeTrustLedgerEntry(entry);
    items.push({
      id: `points-${entry.id}`,
      sector: 'points',
      status: 'completed',
      title: copy.title,
      subtitle: copy.subtitle,
      pointsAmount: entry.appliedDelta,
      currency: 'points',
      occurredAt: entry.createdAt,
      details: trustLedgerActivityDetails(entry),
    });
  }

  for (const sale of sellerSales) {
    const copy = marketplaceActivityFromSale(sale);
    items.push({
      id: `marketplace-${sale.id}`,
      sector: 'marketplace',
      status: copy.status,
      title: copy.title,
      subtitle: copy.subtitle,
      amountCents: sale.sellerNetCents,
      currency: 'try',
      occurredAt: copy.occurredAt,
      details: marketplaceActivityDetails(sale),
    });
  }

  for (const row of driverEarnings.rows) {
    const copy = ridesActivityFromRow(row);
    items.push({
      id: `rides-${row.reservationId}`,
      sector: 'rides',
      status: copy.status,
      title: copy.title,
      subtitle: copy.subtitle,
      amountCents: row.driverPayoutCents,
      currency: 'try',
      occurredAt: copy.occurredAt,
      details: ridesActivityDetails(row),
    });
  }

  for (const row of hotelEarnings.rows) {
    if (row.status === 'cancelled' || row.status === 'refunded') continue;
    const copy = hotelActivityFromRow(row);
    items.push({
      id: `hotel-${row.reservationId}`,
      sector: 'hotel',
      status: copy.status,
      title: copy.title,
      subtitle: copy.subtitle,
      amountCents: row.ownerPayoutCents,
      currency: 'try',
      occurredAt: copy.occurredAt,
      details: hotelActivityDetails(row),
    });
  }

  for (const entry of adWalletEntries) {
    const copy = adWalletActivityFromEntry(entry);
    items.push({
      id: `ads-${entry.id}`,
      sector: 'ads',
      status: copy.status,
      title: copy.title,
      subtitle: copy.subtitle,
      amountCents: entry.amountCents,
      currency: 'try',
      occurredAt: entry.createdAt,
      details: adWalletActivityDetails(entry),
    });
  }

  for (const row of hizmetPayments) {
    const copy = hizmetActivityFromRow(row);
    const signedCents = Math.round(row.amount * 100) * (row.direction === 'out' ? -1 : 1);
    items.push({
      id: `hizmetler-${row.id}`,
      sector: 'hizmetler',
      status: hizmetPaymentWalletStatus(row.status, row.payoutDueAt, row.payoutCompletedAt),
      title: copy.title,
      subtitle: copy.subtitle,
      amountCents: signedCents,
      currency: 'try',
      occurredAt: row.createdAt,
      details: hizmetActivityDetails(row),
    });
  }

  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
