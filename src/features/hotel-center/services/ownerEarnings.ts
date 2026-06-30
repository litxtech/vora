import type { HotelOwnerEarningRow, HotelOwnerEarningsSummary, HotelReservationStatus } from '@/features/hotel-center/types';
import { supabase } from '@/lib/supabase/client';

type EarningRow = {
  id: string;
  reservation_code: string;
  check_in: string;
  check_out: string;
  nights: number;
  gross_amount_cents: number;
  commission_cents: number;
  owner_payout_cents: number;
  status: string;
  payment_status: string;
  paid_at: string | null;
  completed_at: string | null;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  hotel_listings: { name: string } | { name: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRow(row: EarningRow): HotelOwnerEarningRow {
  const hotel = first(row.hotel_listings);
  return {
    reservationId: row.id,
    reservationCode: row.reservation_code,
    hotelName: hotel?.name ?? 'Otel',
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    grossCents: row.gross_amount_cents,
    commissionCents: row.commission_cents,
    ownerPayoutCents: row.owner_payout_cents,
    status: row.status as HotelReservationStatus,
    payoutDueAt: row.payout_due_at,
    payoutCompletedAt: row.payout_completed_at,
    completedAt: row.completed_at,
    paidAt: row.paid_at,
  };
}

export function computeHotelOwnerEarningsSummary(rows: HotelOwnerEarningRow[]): HotelOwnerEarningsSummary {
  let grossCents = 0;
  let commissionCents = 0;
  let netCents = 0;
  let totalPaidCents = 0;
  let scheduledPayoutCents = 0;
  let pendingEscrowCents = 0;

  for (const row of rows) {
    if (row.status === 'cancelled' || row.status === 'refunded') continue;

    grossCents += row.grossCents;
    commissionCents += row.commissionCents;
    netCents += row.ownerPayoutCents;

    if (row.payoutCompletedAt) {
      totalPaidCents += row.ownerPayoutCents;
    } else if (row.status === 'completed') {
      scheduledPayoutCents += row.ownerPayoutCents;
    } else {
      pendingEscrowCents += row.ownerPayoutCents;
    }
  }

  return {
    reservationCount: rows.filter((r) => r.status !== 'cancelled' && r.status !== 'refunded').length,
    grossCents,
    commissionCents,
    netCents,
    totalPaidCents,
    scheduledPayoutCents,
    pendingEscrowCents,
    rows,
  };
}

export async function fetchHotelOwnerEarnings(ownerId: string): Promise<HotelOwnerEarningsSummary> {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .select(`
      id, reservation_code, check_in, check_out, nights,
      gross_amount_cents, commission_cents, owner_payout_cents,
      status, payment_status, paid_at, completed_at, payout_due_at, payout_completed_at,
      hotel_listings (name)
    `)
    .eq('owner_id', ownerId)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error || !data) {
    return computeHotelOwnerEarningsSummary([]);
  }

  const rows = (data as EarningRow[]).map(mapRow);
  return computeHotelOwnerEarningsSummary(rows);
}

export function payoutDaysRemaining(payoutDueAt: string | null | undefined): number | null {
  if (!payoutDueAt) return null;
  const ms = new Date(payoutDueAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function hotelReservationPayoutLabel(reservation: {
  status: HotelReservationStatus;
  payoutDueAt?: string | null;
  payoutCompletedAt?: string | null;
  paidAt?: string | null;
}): string {
  return hotelEarningPayoutLabel({
    reservationId: '',
    reservationCode: '',
    hotelName: '',
    checkIn: '',
    checkOut: '',
    nights: 0,
    grossCents: 0,
    commissionCents: 0,
    ownerPayoutCents: 0,
    status: reservation.status,
    payoutDueAt: reservation.payoutDueAt ?? null,
    payoutCompletedAt: reservation.payoutCompletedAt ?? null,
    completedAt: null,
    paidAt: reservation.paidAt ?? null,
  });
}

export function hotelEarningPayoutLabel(row: HotelOwnerEarningRow): string {
  if (row.payoutCompletedAt) return 'Hesaba yatırıldı';
  if (row.status === 'completed') {
    const days = payoutDaysRemaining(row.payoutDueAt);
    if (days === null) return '7 gün içinde yatacak';
    if (days === 0) return 'Bugün yatırılacak';
    return `${days} gün içinde yatacak`;
  }
  if (row.status === 'confirmed') return 'Konaklama sonrası planlanır';
  return '—';
}
