import type { GenderId } from '@/constants/registration';
import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import type { RideReservation, RideTrip } from '@/features/rides/types';
import { normalizeRideDepartureDate, normalizeRideDepartureTime } from '@/features/rides/utils/rideTimezone';
import { supabaseErrorMessage, rideErrorMessage, edgeFunctionErrorMessage } from '@/lib/errors';

type ReservationRow = {
  id: string;
  trip_id: string;
  passenger_id: string;
  seat_count: number;
  status: string;
  payment_status: string;
  amount_cents: number;
  commission_cents: number;
  driver_payout_cents: number;
  pickup_stop_id: string | null;
  passenger_note: string | null;
  passenger_first_name?: string | null;
  passenger_last_name?: string | null;
  passenger_age?: number | null;
  passenger_gender?: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  ride_trips?: TripNested | TripNested[];
  profiles?: { full_name: string | null; username: string | null; avatar_url: string | null } | { full_name: string | null; username: string | null; avatar_url: string | null }[];
};

type TripNested = {
  id: string;
  from_city_id: string;
  to_city_id: string;
  departure_date: string;
  departure_time: string;
  contribution_cents: number;
  status: string;
  driver_id: string;
};

function mapNestedTrip(raw: TripNested | undefined): RideTrip | null {
  if (!raw) return null;
  return {
    id: raw.id,
    driverId: raw.driver_id,
    fromCityId: raw.from_city_id,
    toCityId: raw.to_city_id,
    departureDate: normalizeRideDepartureDate(raw.departure_date),
    departureTime: normalizeRideDepartureTime(String(raw.departure_time ?? '')),
    contributionCents: raw.contribution_cents,
    status: raw.status as RideTrip['status'],
    vehicleId: null,
    regionId: '',
    fromLat: null,
    fromLng: null,
    toLat: null,
    toLng: null,
    meetingPoint: null,
    dropoffPoint: null,
    tripType: 'one_way',
    currency: 'try',
    seatsTotal: 0,
    availableSeats: 0,
    estimatedDurationMinutes: null,
    description: null,
    luggage: 'small',
    smokingAllowed: false,
    petsAllowed: false,
    womenOnly: false,
    musicPreference: 'any',
    cancellationReason: null,
    viewCount: 0,
    favoriteCount: 0,
    publishedAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

function mapReservation(row: ReservationRow): RideReservation {
  const tripRaw = Array.isArray(row.ride_trips) ? row.ride_trips[0] : row.ride_trips;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    tripId: row.trip_id,
    passengerId: row.passenger_id,
    seatCount: row.seat_count,
    status: row.status as RideReservation['status'],
    paymentStatus: row.payment_status as RideReservation['paymentStatus'],
    amountCents: row.amount_cents,
    commissionCents: row.commission_cents,
    driverPayoutCents: row.driver_payout_cents,
    pickupStopId: row.pickup_stop_id,
    passengerNote: row.passenger_note,
    passengerFirstName: row.passenger_first_name ?? null,
    passengerLastName: row.passenger_last_name ?? null,
    passengerAge: row.passenger_age ?? null,
    passengerGender: (row.passenger_gender as GenderId | null) ?? null,
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    passengerName: profile?.full_name ?? null,
    passengerUsername: profile?.username ?? null,
    passengerAvatarUrl: profile?.avatar_url ?? null,
    trip: mapNestedTrip(tripRaw),
  };
}

export type RidePassengerDetailsInput = {
  note?: string;
  pickupStopId?: string | null;
  passengerFirstName: string;
  passengerLastName: string;
  passengerAge: number;
  passengerGender: import('@/constants/registration').GenderId;
};

export async function requestReservation(
  tripId: string,
  seatCount: number,
  input: RidePassengerDetailsInput,
): Promise<{ reservationId: string | null; error: string | null }> {
  const { data, error } = await ridesSupabase.rpc('request_ride_reservation', {
    p_trip_id: tripId,
    p_seat_count: seatCount,
    p_passenger_note: input.note ?? null,
    p_pickup_stop_id: input.pickupStopId ?? null,
    p_passenger_first_name: input.passengerFirstName.trim(),
    p_passenger_last_name: input.passengerLastName.trim(),
    p_passenger_age: input.passengerAge,
    p_passenger_gender: input.passengerGender,
  });
  if (error) return { reservationId: null, error: rideErrorMessage(supabaseErrorMessage(error) ?? undefined) };
  return { reservationId: data as string, error: null };
}

export async function approveRideReservation(
  reservationId: string,
): Promise<{ error: string | null }> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'stripe-approve-ride-reservation',
    { body: { reservationId } },
  );
  if (error) return { error: await edgeFunctionErrorMessage(error, data, { domain: 'rides' }) };
  if (data?.error) return { error: rideErrorMessage(data.error) };
  return { error: null };
}

export async function respondReservation(
  reservationId: string,
  approve: boolean,
): Promise<{ error: string | null; needsRefund: boolean }> {
  if (approve) {
    const result = await approveRideReservation(reservationId);
    return { error: result.error, needsRefund: false };
  }

  let needsRefund = false;
  const { data: before } = await ridesSupabase
    .from('ride_reservations')
    .select('payment_status')
    .eq('id', reservationId)
    .maybeSingle();
  needsRefund = before?.payment_status === 'held';

  const { error } = await ridesSupabase.rpc('respond_ride_reservation', {
    p_reservation_id: reservationId,
    p_approve: false,
  });
  return { error: error ? rideErrorMessage(supabaseErrorMessage(error) ?? undefined) : null, needsRefund };
}

export async function cancelPassengerReservation(
  reservationId: string,
): Promise<{ error: string | null; needsRefund: boolean }> {
  const { data: before } = await ridesSupabase
    .from('ride_reservations')
    .select('payment_status')
    .eq('id', reservationId)
    .maybeSingle();

  const { error } = await ridesSupabase.rpc('cancel_passenger_reservation', {
    p_reservation_id: reservationId,
  });
  if (error) return { error: rideErrorMessage(supabaseErrorMessage(error) ?? undefined), needsRefund: false };

  const hadPayment = before?.payment_status === 'held';
  return { error: null, needsRefund: hadPayment };
}

export async function requestRideReservationRefund(
  reservationId: string,
): Promise<{ error: string | null; message?: string }> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; message?: string; error?: string; skipped?: boolean }>(
    'stripe-refund-ride-reservation',
    { body: { reservationId } },
  );
  if (error) return { error: await edgeFunctionErrorMessage(error, data, { domain: 'rides' }) };
  if (data?.error) return { error: rideErrorMessage(data.error) };
  return { error: null, message: data?.message ?? (data?.skipped ? undefined : 'Ödemeniz iade edildi') };
}

export async function fetchDriverIncomingReservations(userId: string): Promise<RideReservation[]> {
  const { data, error } = await ridesSupabase
    .from('ride_reservations')
    .select(`
      id, trip_id, passenger_id, seat_count, status, payment_status,
      amount_cents, commission_cents, driver_payout_cents, pickup_stop_id,
      passenger_note, passenger_first_name, passenger_last_name, passenger_age, passenger_gender,
      approved_at, cancelled_at, completed_at, created_at,
      ride_trips!inner (
        id, from_city_id, to_city_id, departure_date, departure_time,
        contribution_cents, status, driver_id
      ),
      profiles!ride_reservations_passenger_id_fkey (full_name, username, avatar_url)
    `)
    .eq('status', 'pending')
    .in('payment_status', ['card_saved', 'held'])
    .eq('ride_trips.driver_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return ((data ?? []) as ReservationRow[]).map(mapReservation);
}

export async function fetchPassengerReservations(userId: string): Promise<RideReservation[]> {
  const { data, error } = await ridesSupabase
    .from('ride_reservations')
    .select(`
      id, trip_id, passenger_id, seat_count, status, payment_status,
      amount_cents, commission_cents, driver_payout_cents, pickup_stop_id,
      passenger_note, passenger_first_name, passenger_last_name, passenger_age, passenger_gender,
      approved_at, cancelled_at, completed_at, created_at,
      ride_trips (
        id, from_city_id, to_city_id, departure_date, departure_time,
        contribution_cents, status, driver_id
      )
    `)
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return ((data ?? []) as ReservationRow[]).map(mapReservation);
}

export async function fetchMyReservationForTrip(
  tripId: string,
  userId: string,
): Promise<RideReservation | null> {
  const { data, error } = await ridesSupabase
    .from('ride_reservations')
    .select('*')
    .eq('trip_id', tripId)
    .eq('passenger_id', userId)
    .in('status', ['pending', 'approved', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapReservation(data as ReservationRow);
}

export async function ensureTripConversation(tripId: string): Promise<string | null> {
  const { data, error } = await ridesSupabase.rpc('ensure_ride_trip_conversation', { p_trip_id: tripId });
  if (error) return null;
  return data as string;
}

export async function countPendingReservationsForDriver(userId: string): Promise<number> {
  const { count, error } = await ridesSupabase
    .from('ride_reservations')
    .select('id, ride_trips!inner(driver_id)', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in('payment_status', ['card_saved', 'held'])
    .eq('ride_trips.driver_id', userId);

  if (error) return 0;
  return count ?? 0;
}
