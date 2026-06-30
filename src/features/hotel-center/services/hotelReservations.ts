import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HotelReservation, HotelReservationStatus } from '@/features/hotel-center/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const RECEIPT_SHARED_PREFIX = 'hotel_receipt_shared_';

type ReservationRow = {
  id: string;
  reservation_code: string;
  hotel_id: string;
  guest_id: string;
  owner_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  student_discount_pct: number;
  gross_amount_cents: number;
  commission_cents: number;
  owner_payout_cents: number;
  guest_note: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_phone: string | null;
  status: string;
  payment_status: string;
  paid_at: string | null;
  owner_receipt_sent_at: string | null;
  completed_at: string | null;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  created_at: string;
  hotel_listings: { name: string; cover_url: string | null } | { name: string; cover_url: string | null }[] | null;
  guest_profile: { username: string | null; full_name: string | null } | { username: string | null; full_name: string | null }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function reservationGuestName(row: ReservationRow): string | null {
  const firstName = row.guest_first_name?.trim();
  const lastName = row.guest_last_name?.trim();
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');
  const guest = first(row.guest_profile);
  return guest?.full_name ?? guest?.username ?? null;
}

function mapReservation(row: ReservationRow): HotelReservation {
  const hotel = first(row.hotel_listings);
  return {
    id: row.id,
    reservationCode: row.reservation_code,
    hotelId: row.hotel_id,
    hotelName: hotel?.name,
    hotelCoverUrl: hotel?.cover_url ?? null,
    guestId: row.guest_id,
    ownerId: row.owner_id,
    guestName: reservationGuestName(row),
    guestFirstName: row.guest_first_name,
    guestLastName: row.guest_last_name,
    guestPhone: row.guest_phone,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guestsCount: row.guests_count,
    studentDiscountPct: row.student_discount_pct,
    grossAmountCents: row.gross_amount_cents,
    commissionCents: row.commission_cents,
    ownerPayoutCents: row.owner_payout_cents,
    guestNote: row.guest_note,
    ownerReceiptSentAt: row.owner_receipt_sent_at,
    completedAt: row.completed_at,
    payoutDueAt: row.payout_due_at,
    payoutCompletedAt: row.payout_completed_at,
    status: row.status as HotelReservationStatus,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

const RESERVATION_SELECT = `
  id, reservation_code, hotel_id, guest_id, owner_id,
  check_in, check_out, nights, guests_count, student_discount_pct,
  gross_amount_cents, commission_cents, owner_payout_cents, guest_note,
  guest_first_name, guest_last_name, guest_phone,
  status, payment_status, paid_at, owner_receipt_sent_at,
  completed_at, payout_due_at, payout_completed_at, created_at,
  hotel_listings (name, cover_url),
  guest_profile:profiles!hotel_reservations_guest_id_fkey (username, full_name)
`;

export async function fetchGuestReservations(userId: string): Promise<HotelReservation[]> {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .select(RESERVATION_SELECT)
    .eq('guest_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchGuestReservations', error.message);
    return [];
  }
  return (data as ReservationRow[]).map(mapReservation);
}

export async function fetchOwnerReservations(userId: string): Promise<HotelReservation[]> {
  const { data, error } = await supabase
    .from('hotel_reservations')
    .select(RESERVATION_SELECT)
    .eq('owner_id', userId)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('fetchOwnerReservations', error.message);
    return [];
  }
  return (data as ReservationRow[]).map(mapReservation);
}

export async function waitForReservationConfirmed(
  reservationId: string,
  timeoutMs = 12000,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase
      .from('hotel_reservations')
      .select('status')
      .eq('id', reservationId)
      .maybeSingle();

    if (data?.status === 'confirmed') return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export async function markReservationCompleted(
  reservationId: string,
  ownerId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('complete_hotel_reservation', {
    p_reservation_id: reservationId,
    p_owner_id: ownerId,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  if (!data) return { error: 'Rezervasyon tamamlanamadı.' };
  return { error: null };
}

export async function wasOwnerReceiptShared(reservationId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(`${RECEIPT_SHARED_PREFIX}${reservationId}`);
  return value === '1';
}

export async function markOwnerReceiptShared(reservationId: string): Promise<void> {
  await AsyncStorage.setItem(`${RECEIPT_SHARED_PREFIX}${reservationId}`, '1');
}

export async function listPendingOwnerReceipts(
  reservations: HotelReservation[],
): Promise<HotelReservation[]> {
  const pending: HotelReservation[] = [];
  for (const reservation of reservations) {
    if (!reservation.ownerReceiptSentAt) continue;
    if (reservation.status !== 'confirmed' && reservation.status !== 'completed') continue;
    const shared = await wasOwnerReceiptShared(reservation.id);
    if (!shared) pending.push(reservation);
  }
  return pending;
}
