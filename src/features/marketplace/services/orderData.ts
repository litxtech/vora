import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceOrder, MarketplaceOrderEvent, SellerPayoutProfile } from '@/features/marketplace/types';
import { normalizeIban, validateTurkishIban } from '@/features/auth/services/validation';
import { supabaseErrorMessage } from '@/lib/errors';

type OrderRow = {
  id: string;
  order_number: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  gross_amount_cents: number;
  commission_cents: number;
  seller_net_cents: number;
  currency: string;
  status: string;
  tracking_number: string | null;
  paid_at: string | null;
  seller_shipped_at: string | null;
  buyer_confirmed_at: string | null;
  platform_approved_at: string | null;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  payout_reference: string | null;
  created_at: string;
  marketplace_listings?: { title: string; cover_url: string | null } | { title: string; cover_url: string | null }[];
  buyer?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[];
  seller?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[];
};

function mapOrder(row: OrderRow): MarketplaceOrder {
  const listing = Array.isArray(row.marketplace_listings) ? row.marketplace_listings[0] : row.marketplace_listings;
  const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer;
  const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;

  return {
    id: row.id,
    orderNumber: row.order_number,
    listingId: row.listing_id,
    listingTitle: listing?.title ?? '—',
    listingCoverUrl: listing?.cover_url ?? null,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    buyerName: buyer?.full_name ?? buyer?.username ?? null,
    sellerName: seller?.full_name ?? seller?.username ?? null,
    grossAmountCents: row.gross_amount_cents,
    commissionCents: row.commission_cents,
    sellerNetCents: row.seller_net_cents,
    currency: row.currency,
    status: row.status as MarketplaceOrder['status'],
    trackingNumber: row.tracking_number,
    paidAt: row.paid_at,
    sellerShippedAt: row.seller_shipped_at,
    buyerConfirmedAt: row.buyer_confirmed_at,
    platformApprovedAt: row.platform_approved_at,
    payoutDueAt: row.payout_due_at,
    payoutCompletedAt: row.payout_completed_at,
    payoutReference: row.payout_reference,
    createdAt: row.created_at,
  };
}

const ORDER_SELECT = `
  id, order_number, listing_id, buyer_id, seller_id,
  gross_amount_cents, commission_cents, seller_net_cents, currency, status,
  tracking_number, paid_at, seller_shipped_at, buyer_confirmed_at,
  platform_approved_at, payout_due_at, payout_completed_at, payout_reference, created_at,
  marketplace_listings (title, cover_url),
  buyer:profiles!marketplace_orders_buyer_id_fkey (full_name, username),
  seller:profiles!marketplace_orders_seller_id_fkey (full_name, username)
`;

function checkoutReturnUrl(listingId: string, result: 'success' | 'cancelled'): string {
  return Linking.createURL(`detail/marketplace/${listingId}`, { queryParams: { checkout: result } });
}

export async function startMarketplaceCheckout(listingId: string): Promise<{ error: string | null }> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-marketplace-checkout',
    {
      body: {
        listingId,
        successUrl: checkoutReturnUrl(listingId, 'success'),
        cancelUrl: checkoutReturnUrl(listingId, 'cancelled'),
      },
    },
  );

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası açılamadı.' };

  await WebBrowser.openAuthSessionAsync(data.url, checkoutReturnUrl(listingId, 'success'));
  return { error: null };
}

export async function fetchBuyerOrders(userId: string): Promise<MarketplaceOrder[]> {
  const { data } = await mpSupabase
    .from('marketplace_orders')
    .select(ORDER_SELECT)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return ((data as OrderRow[] | null) ?? []).map(mapOrder);
}

export async function fetchSellerOrders(userId: string): Promise<MarketplaceOrder[]> {
  const { data } = await mpSupabase
    .from('marketplace_orders')
    .select(ORDER_SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return ((data as OrderRow[] | null) ?? []).map(mapOrder);
}

export async function fetchMarketplaceOrder(orderId: string): Promise<MarketplaceOrder | null> {
  const { data } = await mpSupabase
    .from('marketplace_orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle();

  if (!data) return null;
  return mapOrder(data as OrderRow);
}

export async function fetchOrderEvents(orderId: string): Promise<MarketplaceOrderEvent[]> {
  const { data } = await mpSupabase
    .from('marketplace_order_events')
    .select('id, event_type, actor_role, payload, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  return ((data ?? []) as { id: string; event_type: string; actor_role: string | null; payload: Record<string, unknown>; created_at: string }[]).map(
    (row) => ({
      id: row.id,
      eventType: row.event_type,
      actorRole: row.actor_role,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    }),
  );
}

export async function sellerMarkShipped(
  orderId: string,
  trackingNumber?: string,
): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_seller_mark_shipped', {
    p_order_id: orderId,
    p_tracking_number: trackingNumber,
  });

  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function buyerConfirmReceipt(orderId: string): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_buyer_confirm_receipt', {
    p_order_id: orderId,
  });

  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function fetchSellerPayoutProfile(userId: string): Promise<SellerPayoutProfile | null> {
  const { data } = await mpSupabase
    .from('marketplace_seller_payout_profiles')
    .select('user_id, account_holder, iban, bank_name, verified_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  const row = data as { user_id: string; account_holder: string; iban: string; bank_name: string | null; verified_at: string | null };
  return {
    userId: row.user_id,
    accountHolder: row.account_holder,
    iban: row.iban,
    bankName: row.bank_name,
    verifiedAt: row.verified_at,
  };
}

export async function upsertSellerPayoutProfile(input: {
  userId: string;
  accountHolder: string;
  iban: string;
  bankName?: string | null;
}): Promise<{ error: string | null }> {
  const accountHolder = input.accountHolder.trim();
  if (!accountHolder) {
    return { error: 'Hesap sahibi adı zorunludur.' };
  }

  const iban = normalizeIban(input.iban);
  const ibanError = validateTurkishIban(iban);
  if (ibanError) return { error: ibanError };

  const { error } = await mpSupabase.from('marketplace_seller_payout_profiles').upsert({
    user_id: input.userId,
    account_holder: accountHolder,
    iban,
    bank_name: input.bankName?.trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.message.includes('marketplace_payout_iban_format')) {
      return { error: 'Geçerli bir TR IBAN girin (TR + 24 rakam).' };
    }
    return { error: supabaseErrorMessage(error)! };
  }

  return { error: null };
}

export async function buyerOpenDispute(
  orderId: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('marketplace_buyer_open_dispute', {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function fetchListingOrderForUser(
  listingId: string,
  userId: string,
): Promise<MarketplaceOrder | null> {
  const { data } = await mpSupabase
    .from('marketplace_orders')
    .select(ORDER_SELECT)
    .eq('listing_id', listingId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return mapOrder(data as OrderRow);
}
