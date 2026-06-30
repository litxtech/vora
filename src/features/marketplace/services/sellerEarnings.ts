import { ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import type { SellerSaleRecord } from '@/features/marketplace/types';

export type SellerEarningsSummary = {
  saleCount: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  pendingPayoutCents: number;
  paidOutCents: number;
  manualSaleCount: number;
  platformSaleCount: number;
};

const SETTLED_ORDER_LABELS = new Set([
  ORDER_STATUS_LABELS.payout_completed,
  ORDER_STATUS_LABELS.closed,
]);

function isPlatformPayoutSettled(sale: SellerSaleRecord): boolean {
  return !!sale.payoutCompletedAt || SETTLED_ORDER_LABELS.has(sale.statusLabel);
}

export function computeSellerEarningsSummary(sales: SellerSaleRecord[]): SellerEarningsSummary {
  let grossCents = 0;
  let commissionCents = 0;
  let netCents = 0;
  let pendingPayoutCents = 0;
  let paidOutCents = 0;
  let manualSaleCount = 0;
  let platformSaleCount = 0;

  for (const sale of sales) {
    grossCents += sale.grossAmountCents;
    commissionCents += sale.commissionCents;
    netCents += sale.sellerNetCents;

    if (sale.source === 'manual') {
      manualSaleCount += 1;
      paidOutCents += sale.sellerNetCents;
      continue;
    }

    platformSaleCount += 1;
    if (isPlatformPayoutSettled(sale)) {
      paidOutCents += sale.sellerNetCents;
    } else {
      pendingPayoutCents += sale.sellerNetCents;
    }
  }

  return {
    saleCount: sales.length,
    grossCents,
    commissionCents,
    netCents,
    pendingPayoutCents,
    paidOutCents,
    manualSaleCount,
    platformSaleCount,
  };
}
