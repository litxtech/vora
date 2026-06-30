import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { rideCityName } from '@/features/rides/constants';

export type DriverEarningRow = {
  reservationId: string;
  tripId: string;
  routeLabel: string;
  seatCount: number;
  grossCents: number;
  commissionCents: number;
  driverPayoutCents: number;
  paymentStatus: string;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  completedAt: string | null;
};

export type DriverEarningsSummary = {
  totalPaidCents: number;
  pendingPayoutCents: number;
  scheduledPayoutCents: number;
  rows: DriverEarningRow[];
};

const EMPTY_EARNINGS: DriverEarningsSummary = {
  totalPaidCents: 0,
  pendingPayoutCents: 0,
  scheduledPayoutCents: 0,
  rows: [],
};

type EarningReservationRow = {
  id: string;
  trip_id: string;
  seat_count: number;
  amount_cents: number;
  commission_cents: number;
  driver_payout_cents: number;
  payment_status: string;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  completed_at: string | null;
  ride_trips: { from_city_id: string; to_city_id: string } | { from_city_id: string; to_city_id: string }[];
};

function mapEarningRow(row: EarningReservationRow): DriverEarningRow {
  const tripRaw = Array.isArray(row.ride_trips) ? row.ride_trips[0] : row.ride_trips;
  return {
    reservationId: row.id,
    tripId: row.trip_id,
    routeLabel: `${rideCityName(tripRaw.from_city_id)} → ${rideCityName(tripRaw.to_city_id)}`,
    seatCount: row.seat_count,
    grossCents: row.amount_cents,
    commissionCents: row.commission_cents,
    driverPayoutCents: row.driver_payout_cents,
    paymentStatus: row.payment_status,
    payoutDueAt: row.payout_due_at,
    payoutCompletedAt: row.payout_completed_at,
    completedAt: row.completed_at,
  };
}

export async function fetchDriverEarnings(userId: string): Promise<DriverEarningsSummary> {
  const { data: trips, error: tripsError } = await ridesSupabase
    .from('ride_trips')
    .select('id')
    .eq('driver_id', userId)
    .eq('status', 'completed');

  if (tripsError || !trips?.length) {
    return EMPTY_EARNINGS;
  }

  const tripIds = (trips as Array<{ id: string }>).map((trip) => trip.id);

  const { data, error } = await ridesSupabase
    .from('ride_reservations')
    .select(`
      id, trip_id, seat_count, amount_cents, commission_cents, driver_payout_cents,
      payment_status, payout_due_at, payout_completed_at, completed_at,
      ride_trips!inner ( from_city_id, to_city_id )
    `)
    .in('trip_id', tripIds)
    .or('status.eq.completed,and(status.eq.approved,payment_status.eq.released),and(status.eq.approved,payment_status.eq.held)')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !data) {
    return EMPTY_EARNINGS;
  }

  const rows: DriverEarningRow[] = (data as EarningReservationRow[]).map(mapEarningRow);

  let totalPaidCents = 0;
  let pendingPayoutCents = 0;
  let scheduledPayoutCents = 0;

  for (const row of rows) {
    if (row.payoutCompletedAt) {
      totalPaidCents += row.driverPayoutCents;
    } else if (row.paymentStatus === 'released') {
      scheduledPayoutCents += row.driverPayoutCents;
    } else {
      pendingPayoutCents += row.driverPayoutCents;
    }
  }

  return { totalPaidCents, pendingPayoutCents, scheduledPayoutCents, rows };
}
