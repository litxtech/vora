import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import type { AdminRideTripRow, AdminRidesSummary } from '@/features/rides/types';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminRideReservationRow = {
  id: string;
  tripId: string;
  passengerId: string;
  driverId: string;
  seatCount: number;
  amountCents: number;
  driverPayoutCents: number;
  status: string;
  paymentStatus: string;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  createdAt: string;
};

export type AdminRideLicenseRow = {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  username: string | null;
  fullName: string | null;
  licenseFrontPath: string | null;
  licenseBackPath: string | null;
  selfiePath: string | null;
};

export type AdminRideVehicleRow = {
  id: string;
  userId: string;
  brand: string;
  model: string;
  plate: string;
  verificationStatus: string;
  createdAt: string;
  username: string | null;
  fullName: string | null;
  coverUrl: string | null;
};

export async function fetchAdminRidesSummary(): Promise<AdminRidesSummary | null> {
  const { data, error } = await ridesSupabase.rpc('get_admin_rides_summary');
  if (error || !data) return null;
  const d = data as Record<string, number>;
  return {
    publishedTrips: d.published_trips ?? 0,
    inProgress: d.in_progress ?? 0,
    pendingReservations: d.pending_reservations ?? 0,
    openComplaints: d.open_complaints ?? 0,
    totalCommissionCents: d.total_commission_cents ?? 0,
    escrowCents: d.escrow_cents ?? 0,
    payoutDue: d.payout_due ?? 0,
    pendingLicenses: d.pending_licenses ?? 0,
    pendingVehicles: d.pending_vehicles ?? 0,
  };
}

export async function fetchAdminRideTrips(limit = 50): Promise<AdminRideTripRow[]> {
  const { data, error } = await ridesSupabase.rpc('admin_list_ride_trips', { p_limit: limit });
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    driverId: row.driver_id as string,
    fromCityId: row.from_city_id as string,
    toCityId: row.to_city_id as string,
    status: row.status as AdminRideTripRow['status'],
    departureDate: row.departure_date as string,
    contributionCents: row.contribution_cents as number,
    availableSeats: row.available_seats as number,
    seatsTotal: row.seats_total as number,
    createdAt: row.created_at as string,
  }));
}

export async function fetchAdminRideReservations(limit = 50): Promise<AdminRideReservationRow[]> {
  const { data, error } = await ridesSupabase.rpc('admin_list_ride_reservations', { p_limit: limit });
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    tripId: row.trip_id as string,
    passengerId: row.passenger_id as string,
    driverId: row.driver_id as string,
    seatCount: row.seat_count as number,
    amountCents: row.amount_cents as number,
    driverPayoutCents: row.driver_payout_cents as number,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    payoutDueAt: row.payout_due_at as string | null,
    payoutCompletedAt: row.payout_completed_at as string | null,
    createdAt: row.created_at as string,
  }));
}

export async function fetchAdminRideLicenseQueue(limit = 30): Promise<AdminRideLicenseRow[]> {
  const { data, error } = await ridesSupabase.rpc('admin_list_ride_license_verifications', { p_limit: limit });
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    status: row.status as string,
    createdAt: row.created_at as string,
    username: row.username as string | null,
    fullName: row.full_name as string | null,
    licenseFrontPath: (row.license_front_path as string | null) ?? null,
    licenseBackPath: (row.license_back_path as string | null) ?? null,
    selfiePath: (row.selfie_path as string | null) ?? null,
  }));
}

export async function fetchAdminPendingVehicles(limit = 30): Promise<AdminRideVehicleRow[]> {
  const { data, error } = await ridesSupabase.rpc('admin_list_ride_pending_vehicles', { p_limit: limit });

  if (error) {
    console.warn('[admin] admin_list_ride_pending_vehicles:', error.message);
    const { data: fallback, error: fallbackError } = await ridesSupabase
      .from('ride_vehicles')
      .select('id, user_id, brand, model, plate, verification_status, created_at, cover_url')
      .eq('verification_status', 'pending')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fallbackError) {
      console.warn('[admin] ride_vehicles fallback:', fallbackError.message);
      return [];
    }

    return ((fallback ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      brand: row.brand as string,
      model: row.model as string,
      plate: row.plate as string,
      verificationStatus: row.verification_status as string,
      createdAt: row.created_at as string,
      username: null,
      fullName: null,
      coverUrl: (row.cover_url as string | null) ?? null,
    }));
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    brand: row.brand as string,
    model: row.model as string,
    plate: row.plate as string,
    verificationStatus: row.verification_status as string,
    createdAt: row.created_at as string,
    username: row.username as string | null,
    fullName: row.full_name as string | null,
    coverUrl: (row.cover_url as string | null) ?? null,
  }));
}

export async function adminCancelTrip(tripId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('cancel_ride_trip', { p_trip_id: tripId, p_reason: reason });
  return { error: supabaseErrorMessage(error) };
}

export async function adminMarkRidePayout(
  reservationId: string,
  reference: string,
): Promise<{ error: string | null }> {
  const { data, error } = await ridesSupabase.rpc('admin_mark_ride_payout', {
    p_reservation_id: reservationId,
    p_reference: reference,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { error?: string } | null;
  return { error: result?.error ?? null };
}

export async function adminRefundRideReservation(
  reservationId: string,
): Promise<{ error: string | null; message?: string }> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; message?: string; error?: string }>(
    'stripe-admin-refund',
    { body: { payment_type: 'ride_reservation', record_id: reservationId } },
  );
  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  return { error: null, message: data?.message };
}

export async function adminVerifyRideLicense(
  verificationId: string,
  approve: boolean,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('admin_verify_ride_license', {
    p_verification_id: verificationId,
    p_approve: approve,
    p_reason: reason ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminVerifyRideVehicle(
  vehicleId: string,
  approve: boolean,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('admin_verify_ride_vehicle', {
    p_vehicle_id: vehicleId,
    p_approve: approve,
    p_reason: reason ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}
