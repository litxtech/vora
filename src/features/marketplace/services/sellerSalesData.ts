import { commissionBreakdown, ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import { fetchSellerOrders } from '@/features/marketplace/services/orderData';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceListing, MarketplaceOrder, SellerSaleRecord } from '@/features/marketplace/types';

const LISTING_SOLD_SELECT = `
  id, title, cover_url, price, currency, listing_type, status, sold_at, updated_at
`;

function isCountableOrder(order: MarketplaceOrder): boolean {
  return order.status !== 'cancelled' && order.status !== 'refunded';
}

function listingGrossCents(listing: {
  price: number | null;
  listing_type: string;
}): number {
  if (listing.listing_type === 'free' || listing.listing_type === 'trade') return 0;
  if (listing.price == null || listing.price <= 0) return 0;
  return Math.round(listing.price * 100);
}

function orderToSaleRecord(order: MarketplaceOrder): SellerSaleRecord {
  return {
    id: `order-${order.id}`,
    source: 'order',
    orderId: order.id,
    listingId: order.listingId,
    listingTitle: order.listingTitle,
    listingCoverUrl: order.listingCoverUrl,
    buyerName: order.buyerName,
    grossAmountCents: order.grossAmountCents,
    commissionCents: order.commissionCents,
    sellerNetCents: order.sellerNetCents,
    currency: order.currency,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    soldAt: order.paidAt ?? order.createdAt,
    orderNumber: order.orderNumber,
    payoutDueAt: order.payoutDueAt,
    payoutCompletedAt: order.payoutCompletedAt,
    isPlatformPayout: true,
  };
}

function manualListingToSaleRecord(listing: {
  id: string;
  title: string;
  cover_url: string | null;
  price: number | null;
  currency: string;
  listing_type: string;
  sold_at: string | null;
  updated_at: string;
}): SellerSaleRecord {
  const grossAmountCents = listingGrossCents(listing);
  const { commissionCents, sellerNetCents } = commissionBreakdown(grossAmountCents);

  return {
    id: `manual-${listing.id}`,
    source: 'manual',
    orderId: null,
    listingId: listing.id,
    listingTitle: listing.title,
    listingCoverUrl: listing.cover_url,
    buyerName: null,
    grossAmountCents,
    commissionCents,
    sellerNetCents,
    currency: listing.currency,
    statusLabel: 'Manuel satış',
    soldAt: listing.sold_at ?? listing.updated_at,
    orderNumber: null,
    payoutDueAt: null,
    payoutCompletedAt: null,
    isPlatformPayout: false,
  };
}

async function fetchSoldListingsForSeller(sellerId: string) {
  const { data, error } = await mpSupabase
    .from('marketplace_listings')
    .select(LISTING_SOLD_SELECT)
    .eq('author_id', sellerId)
    .eq('status', 'sold')
    .order('sold_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    console.warn('fetchSoldListingsForSeller', error.message);
    return [];
  }

  return (data ?? []) as {
    id: string;
    title: string;
    cover_url: string | null;
    price: number | null;
    currency: string;
    listing_type: string;
    sold_at: string | null;
    updated_at: string;
  }[];
}

export async function fetchSellerSales(sellerId: string): Promise<SellerSaleRecord[]> {
  const [orders, soldListings] = await Promise.all([
    fetchSellerOrders(sellerId),
    fetchSoldListingsForSeller(sellerId),
  ]);

  const countableOrders = orders.filter(isCountableOrder);
  const orderListingIds = new Set(countableOrders.map((o) => o.listingId));

  const manualSales = soldListings
    .filter((l) => !orderListingIds.has(l.id))
    .map(manualListingToSaleRecord);

  const platformSales = countableOrders.map(orderToSaleRecord);

  return [...platformSales, ...manualSales].sort(
    (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
  );
}

export function listingToManualSalePreview(listing: MarketplaceListing): SellerSaleRecord | null {
  if (listing.status !== 'sold') return null;
  return manualListingToSaleRecord({
    id: listing.id,
    title: listing.title,
    cover_url: listing.coverUrl,
    price: listing.price,
    currency: listing.currency,
    listing_type: listing.listingType,
    sold_at: listing.soldAt ?? null,
    updated_at: listing.updatedAt,
  });
}
