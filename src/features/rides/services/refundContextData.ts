import {
  formatContribution,
  formatRideReservationRef,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  rideCityName,
  TRIP_STATUS_LABELS,
} from '@/features/rides/constants';
import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { fetchRideTrip } from '@/features/rides/services/tripData';
import { fetchVehicle } from '@/features/rides/services/vehicleData';
import type { RideReservation, RideTrip } from '@/features/rides/types';
import { formatRideDeparture } from '@/features/rides/utils/dateFormat';
import { normalizeRideDepartureDate, normalizeRideDepartureTime } from '@/features/rides/utils/rideTimezone';

export type RideRefundContext = {
  reservation: RideReservation;
  trip: RideTrip;
  referenceCode: string;
  passengerName: string;
  passengerUsername: string | null;
  driverName: string;
  driverUsername: string | null;
  vehicleLabel: string | null;
  vehiclePlate: string | null;
};

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
  approved_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[];
};

function mapReservationRow(row: ReservationRow): RideReservation {
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
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    passengerName: profile?.full_name ?? null,
    passengerUsername: profile?.username ?? null,
  };
}

async function fetchReservationRow(
  userId: string,
  reservationId?: string,
  tripId?: string,
): Promise<ReservationRow | null> {
  let query = ridesSupabase
    .from('ride_reservations')
    .select(
      `
      id, trip_id, passenger_id, seat_count, status, payment_status,
      amount_cents, commission_cents, driver_payout_cents, pickup_stop_id,
      passenger_note, approved_at, cancelled_at, completed_at, created_at,
      profiles!ride_reservations_passenger_id_fkey (full_name, username)
    `,
    )
    .eq('passenger_id', userId);

  if (reservationId) {
    query = query.eq('id', reservationId);
  } else if (tripId) {
    query = query.eq('trip_id', tripId).order('created_at', { ascending: false }).limit(1);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as ReservationRow;
}

export async function fetchRideRefundContext(options: {
  userId: string;
  reservationId?: string;
  tripId?: string;
}): Promise<RideRefundContext | null> {
  const row = await fetchReservationRow(options.userId, options.reservationId, options.tripId);
  if (!row) return null;

  const reservation = mapReservationRow(row);
  const trip = await fetchRideTrip(reservation.tripId, options.userId);
  if (!trip) return null;

  let vehicleLabel: string | null = null;
  let vehiclePlate: string | null = null;
  if (trip.vehicleId) {
    const vehicle = await fetchVehicle(trip.vehicleId);
    if (vehicle) {
      vehicleLabel = `${vehicle.brand} ${vehicle.model}`.trim();
      vehiclePlate = vehicle.plate;
    }
  } else if (trip.vehicleBrand || trip.vehicleModel) {
    vehicleLabel = [trip.vehicleBrand, trip.vehicleModel].filter(Boolean).join(' ').trim() || null;
  }

  return {
    reservation,
    trip,
    referenceCode: formatRideReservationRef(reservation.id),
    passengerName: reservation.passengerName?.trim() || 'Yolcu',
    passengerUsername: reservation.passengerUsername ?? null,
    driverName: trip.driverName?.trim() || 'Sürücü',
    driverUsername: trip.driverUsername ?? null,
    vehicleLabel,
    vehiclePlate,
  };
}

export function buildRideRefundContextLines(context: RideRefundContext): string[] {
  const { reservation, trip } = context;
  const route = `${rideCityName(trip.fromCityId)} → ${rideCityName(trip.toCityId)}`;
  const stops = trip.stops?.map((s) => rideCityName(s.cityId)).filter(Boolean).join(', ');

  return [
    `Rezervasyon no: ${context.referenceCode}`,
    `Yolcu: ${context.passengerName}${context.passengerUsername ? ` (@${context.passengerUsername})` : ''}`,
    `Sürücü: ${context.driverName}${context.driverUsername ? ` (@${context.driverUsername})` : ''}`,
    `Rota: ${route}`,
    stops ? `Ara duraklar: ${stops}` : null,
    `Kalkış: ${formatRideDeparture(normalizeRideDepartureDate(trip.departureDate), normalizeRideDepartureTime(trip.departureTime))}`,
    trip.meetingPoint ? `Buluşma: ${trip.meetingPoint}` : null,
    trip.dropoffPoint ? `İniş: ${trip.dropoffPoint}` : null,
    context.vehicleLabel ? `Araç: ${context.vehicleLabel}` : null,
    context.vehiclePlate ? `Plaka: ${context.vehiclePlate}` : null,
    `Koltuk: ${reservation.seatCount}`,
    `Tutar: ${formatContribution(reservation.amountCents)}`,
    `Rezervasyon: ${RESERVATION_STATUS_LABELS[reservation.status]}`,
    `Ödeme: ${PAYMENT_STATUS_LABELS[reservation.paymentStatus] ?? reservation.paymentStatus}`,
    `Yolculuk: ${TRIP_STATUS_LABELS[trip.status]}`,
    reservation.passengerNote ? `Yolcu notu: ${reservation.passengerNote}` : null,
    `Rezervasyon ID: ${reservation.id}`,
    `Yolculuk ID: ${trip.id}`,
  ].filter((line): line is string => Boolean(line));
}

export function buildRideRefundLiveDraft(context: RideRefundContext): string {
  return `Yolculuk iade talebi — ${context.referenceCode}\n${buildRideRefundContextLines(context).join('\n')}\n\nSorunum: `;
}

export function buildRideRefundTicketBody(context: RideRefundContext, userMessage: string): string {
  return `${buildRideRefundContextLines(context).join('\n')}\n\n---\n\n${userMessage.trim()}`;
}
