import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type {
  AdminHotelReservationRow,
  CommerceOpsSummary,
  CommerceQueueFilter,
  CommerceTransactionRow,
} from '@/features/commerce-ops/types';

function mapSummary(raw: Record<string, number>): CommerceOpsSummary {
  return {
    hotelPendingPayment: raw.hotel_pending_payment ?? 0,
    hotelConfirmed: raw.hotel_confirmed ?? 0,
    hotelPayoutDue: raw.hotel_payout_due ?? 0,
    hotelPayoutOverdue: raw.hotel_payout_overdue ?? 0,
    hotelRevenue24hCents: raw.hotel_revenue_24h_cents ?? 0,
    hotelCommission24hCents: raw.hotel_commission_24h_cents ?? 0,
    marketplaceEscrowCents: raw.marketplace_escrow_cents ?? 0,
    marketplaceApprovalPending: raw.marketplace_approval_pending ?? 0,
    marketplacePayoutOverdue: raw.marketplace_payout_overdue ?? 0,
    ridesPendingReservations: raw.rides_pending_reservations ?? 0,
    ridesEscrowCents: raw.rides_escrow_cents ?? 0,
    ridesPayoutDue: raw.rides_payout_due ?? 0,
    personnelApplicationsPending: raw.personnel_applications_pending ?? 0,
    personnelStaffListings: raw.personnel_staff_listings ?? 0,
    personnelJobListings: raw.personnel_job_listings ?? 0,
    transactions24h: raw.transactions_24h ?? 0,
    totalEscrowCents: raw.total_escrow_cents ?? 0,
  };
}

function mapTransaction(row: Record<string, unknown>): CommerceTransactionRow {
  return {
    id: row.id as string,
    module: row.module as CommerceTransactionRow['module'],
    referenceCode: row.reference_code as string,
    title: row.title as string,
    fromPartyId: row.from_party_id as string,
    fromPartyName: row.from_party_name as string,
    toPartyId: row.to_party_id as string,
    toPartyName: row.to_party_name as string,
    grossCents: row.gross_cents as number,
    commissionCents: row.commission_cents as number,
    netCents: row.net_cents as number,
    status: row.status as string,
    paymentStatus: (row.payment_status as string | null) ?? null,
    regionId: (row.region_id as string | null) ?? null,
    createdAt: row.created_at as string,
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}

function mapHotelReservation(row: Record<string, unknown>): AdminHotelReservationRow {
  return {
    id: row.id as string,
    reservationCode: row.reservation_code as string,
    hotelId: row.hotel_id as string,
    hotelName: row.hotel_name as string,
    guestId: row.guest_id as string,
    guestName: row.guest_name as string,
    ownerId: row.owner_id as string,
    ownerName: row.owner_name as string,
    regionId: row.region_id as string,
    checkIn: row.check_in as string,
    checkOut: row.check_out as string,
    nights: row.nights as number,
    guestsCount: row.guests_count as number,
    grossAmountCents: row.gross_amount_cents as number,
    commissionCents: row.commission_cents as number,
    ownerPayoutCents: row.owner_payout_cents as number,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    paidAt: (row.paid_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    payoutDueAt: (row.payout_due_at as string | null) ?? null,
    payoutCompletedAt: (row.payout_completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function fetchCommerceOpsSummary(): Promise<CommerceOpsSummary | null> {
  const { data, error } = await supabase.rpc('get_commerce_ops_summary');
  if (error || !data) return null;
  return mapSummary(data as Record<string, number>);
}

export async function fetchCommerceTransactions(
  module: 'all' | CommerceTransactionRow['module'] = 'all',
  filter: CommerceQueueFilter = 'all',
  limit = 50,
): Promise<CommerceTransactionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_commerce_transactions', {
    p_module: module,
    p_filter: filter,
    p_limit: limit,
  });
  if (error) {
    console.warn('[commerce-ops] admin_list_commerce_transactions', error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapTransaction);
}

export async function fetchAdminHotelReservations(
  filter: CommerceQueueFilter = 'all',
  limit = 50,
): Promise<AdminHotelReservationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_hotel_reservations', {
    p_filter: filter,
    p_limit: limit,
  });
  if (error) {
    console.warn('[commerce-ops] admin_list_hotel_reservations', error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapHotelReservation);
}

export async function adminCancelHotelReservation(
  reservationId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_cancel_hotel_reservation', {
    p_reservation_id: reservationId,
    p_reason: reason ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { error?: string; ok?: boolean } | null;
  return { error: result?.error ?? null };
}

export async function adminRefundHotelReservation(
  reservationId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_mark_hotel_reservation_refunded', {
    p_reservation_id: reservationId,
    p_reason: reason ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { error?: string; ok?: boolean } | null;
  return { error: result?.error ?? null };
}

export async function adminMarkHotelPayout(
  reservationId: string,
  reference?: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_mark_hotel_payout', {
    p_reservation_id: reservationId,
    p_reference: reference ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { error?: string; ok?: boolean } | null;
  return { error: result?.error ?? null };
}
