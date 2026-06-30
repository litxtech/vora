import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceAdminSummary } from '@/features/marketplace/types';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminMarketplaceOrderRow = {
  id: string;
  order_number: string;
  listing_title: string;
  buyer_name: string;
  seller_name: string;
  gross_amount_cents: number;
  commission_cents: number;
  seller_net_cents: number;
  status: string;
  paid_at: string | null;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  created_at: string;
};

export type AdminMarketplaceListingRow = {
  id: string;
  title: string;
  author_id: string;
  region_id: string;
  category: string;
  status: string;
  content_status: string;
  price: number | null;
  favorite_count: number;
  cover_url: string | null;
  created_at: string;
};

export async function fetchAdminMarketplaceSummary(): Promise<MarketplaceAdminSummary | null> {
  const { data, error } = await mpSupabase.rpc('get_admin_marketplace_summary');
  if (error || !data) return null;

  const s = data as Record<string, number>;
  return {
    activeListings: s.active_listings ?? 0,
    escrowTotalCents: s.escrow_total_cents ?? 0,
    awaitingPlatformApproval: s.awaiting_platform_approval ?? 0,
    payoutDueToday: s.payout_due_today ?? 0,
    payoutOverdue: s.payout_overdue ?? 0,
    totalCommission: s.total_commission ?? 0,
    pendingReports: s.pending_reports ?? 0,
  };
}

export async function fetchAdminMarketplaceOrders(
  filter: 'all' | 'approval' | 'payout_due' | 'overdue' | 'escrow' = 'all',
): Promise<AdminMarketplaceOrderRow[]> {
  const { data, error } = await mpSupabase.rpc('admin_list_marketplace_orders', {
    p_filter: filter,
    p_limit: 50,
  });

  if (error) return [];
  return (data as AdminMarketplaceOrderRow[]) ?? [];
}

export async function fetchAdminMarketplaceListings(): Promise<AdminMarketplaceListingRow[]> {
  const { data, error } = await mpSupabase.rpc('admin_list_marketplace_listings', { p_limit: 50 });
  if (error) return [];
  return (data as AdminMarketplaceListingRow[]) ?? [];
}

export async function adminPlatformApproveOrder(orderId: string): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('admin_marketplace_platform_approve', {
    p_order_id: orderId,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function adminMarkPayout(
  orderId: string,
  reference: string,
  notes?: string,
): Promise<{ error: string | null }> {
  const { data, error } = await mpSupabase.rpc('admin_marketplace_mark_payout', {
    p_order_id: orderId,
    p_reference: reference,
    p_notes: notes,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function adminHideListing(listingId: string): Promise<{ error: string | null }> {
  const { error } = await mpSupabase.rpc('admin_set_marketplace_listing_content_status', {
    p_listing_id: listingId,
    p_status: 'hidden',
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminRemoveListing(listingId: string): Promise<{ error: string | null }> {
  const { error } = await mpSupabase.rpc('admin_set_marketplace_listing_content_status', {
    p_listing_id: listingId,
    p_status: 'removed',
  });
  return { error: supabaseErrorMessage(error) };
}

export type AdminMarketplacePayoutProfileRow = {
  user_id: string;
  account_holder: string;
  iban: string;
  bank_name: string | null;
  verified_at: string | null;
  seller_name: string | null;
  seller_username: string | null;
  updated_at: string;
};

export async function fetchAdminMarketplacePayoutProfiles(): Promise<AdminMarketplacePayoutProfileRow[]> {
  const { data, error } = await mpSupabase.rpc('admin_list_marketplace_payout_profiles', { p_limit: 50 });
  if (error) return [];
  return (data as AdminMarketplacePayoutProfileRow[]) ?? [];
}

export async function adminVerifyPayoutProfile(userId: string): Promise<{ error: string | null }> {
  const { error } = await mpSupabase.rpc('admin_verify_marketplace_payout_profile', {
    p_user_id: userId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminRefundMarketplaceOrder(orderId: string): Promise<{ error: string | null; message?: string }> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; message?: string; error?: string }>(
    'stripe-admin-refund',
    { body: { payment_type: 'marketplace_order', record_id: orderId } },
  );
  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  return { error: null, message: data?.message };
}
