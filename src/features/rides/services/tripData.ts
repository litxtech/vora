import { RIDE_CITIES, maxRidePassengerSeats } from '@/features/rides/constants';
import { ridesSupabase } from '@/features/rides/services/ridesSupabase';
import { fetchFavoriteIds } from '@/features/rides/services/favoriteData';
import { fetchVehicle } from '@/features/rides/services/vehicleData';
import { resolveRideVehiclePhotoUrl } from '@/features/rides/utils/rideMediaUrl';
import { sanitizeAvatarUrl } from '@/features/account-deletion/utils';
import type {
  CreateTripInput,
  RideFilters,
  RideTab,
  RideTrip,
  RideTripStop,
  UpdateTripDraftInput,
} from '@/features/rides/types';
import { istanbulDatePlusDaysIso, istanbulTodayIso, isFutureRideDeparture, normalizeRideDepartureDate, normalizeRideDepartureTime } from '@/features/rides/utils/rideTimezone';
import { hasActiveRideFilters } from '@/features/rides/utils/searchSummary';
import { estimateRideDurationMinutes } from '@/features/rides/utils/estimateRouteDuration';
import { supabaseErrorMessage, edgeFunctionErrorMessage, rideErrorMessage } from '@/lib/errors/userFacingError';

type TripRow = {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  region_id: string;
  from_city_id: string;
  to_city_id: string;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  meeting_point: string | null;
  dropoff_point: string | null;
  trip_type: string;
  contribution_cents: number;
  currency: string;
  seats_total: number;
  available_seats: number;
  departure_date: string;
  departure_time: string;
  estimated_duration_minutes: number | null;
  description: string | null;
  luggage: string;
  smoking_allowed: boolean;
  pets_allowed: boolean;
  women_only: boolean;
  music_preference: string;
  status: string;
  cancellation_reason: string | null;
  view_count: number;
  favorite_count: number;
  published_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; username: string | null; is_verified: boolean; avatar_url: string | null; account_status?: string | null } | { full_name: string | null; username: string | null; is_verified: boolean; avatar_url: string | null; account_status?: string | null }[];
  ride_vehicles?: { brand: string; model: string; cover_url: string | null; photo_urls: string[] } | { brand: string; model: string; cover_url: string | null; photo_urls: string[] }[];
};

type StopRow = {
  id: string;
  trip_id: string;
  city_id: string;
  stop_order: number;
  latitude: number | null;
  longitude: number | null;
};

const TRIP_COLUMNS = `
  id, driver_id, vehicle_id, region_id, from_city_id, to_city_id,
  from_lat, from_lng, to_lat, to_lng, meeting_point, dropoff_point,
  trip_type, contribution_cents, currency, seats_total, available_seats,
  departure_date, departure_time, estimated_duration_minutes, description,
  luggage, smoking_allowed, pets_allowed, women_only, music_preference,
  status, cancellation_reason, view_count, favorite_count,
  published_at, started_at, completed_at, created_at, updated_at
`;

const TRIP_SELECT = `
  ${TRIP_COLUMNS.trim()},
  profiles!ride_trips_driver_id_fkey (full_name, username, is_verified, avatar_url, account_status),
  ride_vehicles!ride_trips_vehicle_id_fkey (brand, model, cover_url, photo_urls)
`;

function mapTrip(row: TripRow, extras?: Partial<RideTrip>): RideTrip {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const vehicle = Array.isArray(row.ride_vehicles) ? row.ride_vehicles[0] : row.ride_vehicles;
  const vehicleRaw = vehicle?.cover_url ?? vehicle?.photo_urls?.[0] ?? null;
  return {
    id: row.id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    regionId: row.region_id,
    fromCityId: row.from_city_id,
    toCityId: row.to_city_id,
    fromLat: row.from_lat,
    fromLng: row.from_lng,
    toLat: row.to_lat,
    toLng: row.to_lng,
    meetingPoint: row.meeting_point,
    dropoffPoint: row.dropoff_point,
    tripType: row.trip_type as RideTrip['tripType'],
    contributionCents: row.contribution_cents,
    currency: row.currency,
    seatsTotal: row.seats_total,
    availableSeats: row.available_seats,
    departureDate: normalizeRideDepartureDate(row.departure_date),
    departureTime: normalizeRideDepartureTime(String(row.departure_time ?? '')),
    estimatedDurationMinutes: row.estimated_duration_minutes,
    description: row.description,
    luggage: row.luggage as RideTrip['luggage'],
    smokingAllowed: row.smoking_allowed,
    petsAllowed: row.pets_allowed,
    womenOnly: row.women_only,
    musicPreference: row.music_preference as RideTrip['musicPreference'],
    status: row.status as RideTrip['status'],
    cancellationReason: row.cancellation_reason,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    publishedAt: row.published_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    driverName: profile?.full_name ?? null,
    driverUsername: profile?.username ?? null,
    driverAvatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, profile?.account_status),
    driverVerified: profile?.is_verified ?? false,
    vehicleBrand: vehicle?.brand ?? null,
    vehicleModel: vehicle?.model ?? null,
    vehiclePhotoUrl: resolveRideVehiclePhotoUrl(vehicleRaw),
    ...extras,
  };
}

function mapStop(row: StopRow): RideTripStop {
  return {
    id: row.id,
    cityId: row.city_id,
    stopOrder: row.stop_order,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function cityCoords(cityId: string): { lat: number; lng: number } | null {
  const city = RIDE_CITIES.find((c) => c.id === cityId);
  return city ? { lat: city.lat, lng: city.lng } : null;
}

function todayIso(): string {
  return istanbulTodayIso();
}

function weekEndIso(): string {
  return istanbulDatePlusDaysIso(7);
}

type PublicRideQuery = {
  departureDate?: string | null;
  fromCityId?: string | null;
  toCityId?: string | null;
  minSeats?: number;
  womenOnly?: boolean | null;
  petsAllowed?: boolean | null;
  noSmoking?: boolean | null;
  maxContributionCents?: number | null;
  limit?: number;
};

/** RLS üzerinden yayındaki yolculuklar — RPC olmadan da çalışır. */
async function fetchPublicRideRows(query: PublicRideQuery): Promise<TripRow[]> {
  let q = ridesSupabase.from('ride_trips').select(TRIP_COLUMNS).in('status', ['published', 'full']);

  if (query.departureDate) {
    q = q.eq('departure_date', query.departureDate);
  } else {
    q = q.gte('departure_date', istanbulTodayIso());
  }
  if (query.fromCityId) q = q.eq('from_city_id', query.fromCityId);
  if (query.toCityId) q = q.eq('to_city_id', query.toCityId);
  if (query.minSeats != null && query.minSeats > 0) q = q.gte('available_seats', query.minSeats);
  if (query.womenOnly != null) q = q.eq('women_only', query.womenOnly);
  if (query.petsAllowed != null) q = q.eq('pets_allowed', query.petsAllowed);
  if (query.noSmoking) q = q.eq('smoking_allowed', false);
  if (query.maxContributionCents != null) q = q.lte('contribution_cents', query.maxContributionCents);

  const { data, error } = await q
    .order('departure_date', { ascending: true })
    .order('departure_time', { ascending: true })
    .limit(query.limit ?? 100);

  if (error) throw new Error(supabaseErrorMessage(error)!);

  return ((data ?? []) as TripRow[]).filter((row) =>
    isFutureRideDeparture(normalizeRideDepartureDate(row.departure_date), String(row.departure_time ?? '')),
  );
}

async function assertTripPublished(tripId: string): Promise<{ error: string | null }> {
  const { data, error } = await ridesSupabase
    .from('ride_trips')
    .select('status')
    .eq('id', tripId)
    .maybeSingle();

  if (error) return { error: supabaseErrorMessage(error)! };
  const status = (data as { status?: string } | null)?.status;
  if (status === 'published' || status === 'full') return { error: null };

  return {
    error:
      'Yolculuk yayınlanamadı ve taslak olarak kaldı. Araç ve ehliyet onayınızı kontrol edip tekrar «Yayınla» deyin.',
  };
}

async function publishRideTripRecord(tripId: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error: updateError } = await ridesSupabase
    .from('ride_trips')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', tripId);

  if (updateError) return { error: updateError.message };
  return assertTripPublished(tripId);
}

async function attachStopsToTrips(trips: RideTrip[]): Promise<RideTrip[]> {
  if (!trips.length) return trips;
  const tripIds = trips.map((t) => t.id);
  const { data, error } = await ridesSupabase
    .from('ride_trip_stops')
    .select('id, trip_id, city_id, stop_order, latitude, longitude')
    .in('trip_id', tripIds)
    .order('stop_order', { ascending: true });

  if (error || !data?.length) return trips;

  const byTrip = new Map<string, RideTripStop[]>();
  for (const row of data as StopRow[]) {
    const list = byTrip.get(row.trip_id) ?? [];
    list.push(mapStop(row));
    byTrip.set(row.trip_id, list);
  }

  return trips.map((t) => ({ ...t, stops: byTrip.get(t.id) ?? t.stops ?? [] }));
}

async function enrichListedTrips(trips: RideTrip[]): Promise<RideTrip[]> {
  if (!trips.length) return trips;

  const driverIds = [...new Set(trips.map((t) => t.driverId))];
  const vehicleIds = [...new Set(trips.map((t) => t.vehicleId).filter((id): id is string => !!id))];

  type ListingDriverRow = {
    id: string;
    full_name: string | null;
    username: string | null;
    is_verified: boolean;
    avatar_url: string | null;
    account_status: string | null;
  };

  type ListingVehicleRow = {
    id: string;
    brand: string;
    model: string;
    cover_url: string | null;
    photo_urls: string[];
  };

  const [{ data: drivers, error: driversError }, vehiclesResult] = await Promise.all([
    ridesSupabase.rpc('get_ride_listing_driver_profiles', { p_driver_ids: driverIds }),
    vehicleIds.length
      ? ridesSupabase.from('ride_vehicles').select('id, brand, model, cover_url, photo_urls').in('id', vehicleIds)
      : Promise.resolve({ data: [] as ListingVehicleRow[] }),
  ]);

  let driverRows = (drivers ?? []) as ListingDriverRow[];
  if (driversError) {
    const { data: fallbackDrivers } = await ridesSupabase
      .from('profiles')
      .select('id, full_name, username, is_verified, avatar_url, account_status')
      .in('id', driverIds);
    driverRows = ((fallbackDrivers ?? []) as ListingDriverRow[]);
  }

  const driverById = new Map(driverRows.map((d) => [d.id, d]));
  const vehicleById = new Map(((vehiclesResult.data ?? []) as ListingVehicleRow[]).map((v) => [v.id, v]));

  return trips.map((trip) => {
    const driver = driverById.get(trip.driverId);
    const vehicle = trip.vehicleId ? vehicleById.get(trip.vehicleId) : undefined;
    const vehicleRaw = vehicle?.cover_url ?? vehicle?.photo_urls?.[0] ?? null;

    return {
      ...trip,
      driverName: driver?.full_name ?? trip.driverName,
      driverUsername: driver?.username ?? trip.driverUsername,
      driverAvatarUrl: sanitizeAvatarUrl(driver?.avatar_url ?? trip.driverAvatarUrl, driver?.account_status),
      driverVerified: driver?.is_verified ?? trip.driverVerified,
      vehicleBrand: vehicle?.brand ?? trip.vehicleBrand,
      vehicleModel: vehicle?.model ?? trip.vehicleModel,
      vehiclePhotoUrl: resolveRideVehiclePhotoUrl(vehicleRaw) ?? trip.vehiclePhotoUrl,
    };
  });
}

export async function fetchRideTrips(
  tab: RideTab,
  regionId: string | null,
  userId: string | null,
  filters: RideFilters = {},
): Promise<RideTrip[]> {
  if (tab === 'mine') {
    if (!userId) return [];
    const { data, error } = await ridesSupabase
      .from('ride_trips')
      .select(TRIP_SELECT)
      .eq('driver_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(supabaseErrorMessage(error)!);
    return attachStopsToTrips((data as TripRow[]).map((r) => mapTrip(r)));
  }

  if (tab === 'ongoing') {
    let q = ridesSupabase.from('ride_trips').select(TRIP_SELECT).eq('status', 'in_progress');
    if (regionId) q = q.eq('region_id', regionId);
    const { data, error } = await q.order('started_at', { ascending: false }).limit(50);
    if (error) throw new Error(supabaseErrorMessage(error)!);
    let trips = await enrichListedTrips((data as TripRow[]).map((r) => mapTrip(r)));
    if (userId && trips.length) {
      const favIds = new Set(await fetchFavoriteIds(userId));
      trips = trips.map((t) => ({ ...t, isFavorite: favIds.has(t.id) }));
    }
    return attachStopsToTrips(trips);
  }

  if (tab === 'favorites') {
    if (!userId) return [];
    const favIds = await fetchFavoriteIds(userId);
    if (!favIds.length) return [];
    const { data, error } = await ridesSupabase
      .from('ride_trips')
      .select(TRIP_SELECT)
      .in('id', favIds)
      .in('status', ['published', 'full', 'in_progress'])
      .order('departure_date', { ascending: true });
    if (error) throw new Error(supabaseErrorMessage(error)!);
    return attachStopsToTrips(await enrichListedTrips((data as TripRow[]).map((r) => mapTrip(r, { isFavorite: true }))));
  }

  let departureDate = filters.departureDate ?? null;
  if (tab === 'today') departureDate = todayIso();

  const discoverShowAll = tab === 'discover' && !hasActiveRideFilters(filters);
  const rows = await fetchPublicRideRows({
    departureDate: tab === 'week' || discoverShowAll ? null : departureDate,
    fromCityId: discoverShowAll ? null : (filters.fromCityId ?? null),
    toCityId: discoverShowAll ? null : (filters.toCityId ?? null),
    minSeats: discoverShowAll ? 0 : (filters.minSeats ?? 1),
    womenOnly: discoverShowAll ? null : (filters.womenOnly ?? null),
    petsAllowed: discoverShowAll ? null : (filters.petsAllowed ?? null),
    noSmoking: discoverShowAll ? null : (filters.noSmoking ?? null),
    maxContributionCents: discoverShowAll ? null : (filters.maxContributionCents ?? null),
    limit: discoverShowAll ? 100 : 40,
  });

  let trips = await enrichListedTrips(rows.map((r) => mapTrip(r)));

  if (tab === 'week') {
    const end = weekEndIso();
    const start = todayIso();
    trips = trips.filter((t) => t.departureDate >= start && t.departureDate <= end);
  }

  if (userId && trips.length) {
    const favIds = new Set(await fetchFavoriteIds(userId));
    trips = trips.map((t) => ({ ...t, isFavorite: favIds.has(t.id) }));
  }

  return attachStopsToTrips(trips);
}

export async function fetchRideTrip(id: string, userId?: string | null): Promise<RideTrip | null> {
  const { data, error } = await ridesSupabase.from('ride_trips').select(TRIP_COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;

  const { data: stops } = await ridesSupabase
    .from('ride_trip_stops')
    .select('id, trip_id, city_id, stop_order, latitude, longitude')
    .eq('trip_id', id)
    .order('stop_order', { ascending: true });

  let isFavorite = false;
  if (userId) {
    const favIds = await fetchFavoriteIds(userId);
    isFavorite = favIds.includes(id);
  }

  const { data: conv } = await ridesSupabase
    .from('ride_trip_conversations')
    .select('conversation_id')
    .eq('trip_id', id)
    .maybeSingle();

  let trip = mapTrip(data as TripRow, {
    stops: ((stops ?? []) as StopRow[]).map(mapStop),
    isFavorite,
    conversationId: (conv as { conversation_id?: string } | null)?.conversation_id ?? null,
  });

  [trip] = await enrichListedTrips([trip]);

  return trip;
}

export async function createRideTrip(userId: string, input: CreateTripInput): Promise<{ tripId: string | null; error: string | null }> {
  const vehicle = await fetchVehicle(input.vehicleId);
  if (!vehicle) {
    return { tripId: null, error: 'Araç bulunamadı' };
  }
  if (vehicle.userId !== userId) {
    return { tripId: null, error: 'Bu araca erişiminiz yok' };
  }
  const maxSeats = maxRidePassengerSeats(vehicle.seatsTotal);
  if (input.seatsTotal > maxSeats || input.seatsTotal < 1) {
    return {
      tripId: null,
      error: `Bu araçta en fazla ${maxSeats} yolcu koltuğu paylaşılabilir (${vehicle.seatsTotal} koltuklu araç).`,
    };
  }

  const fromCoords = cityCoords(input.fromCityId);
  const toCoords = cityCoords(input.toCityId);
  const publishing = input.publish;
  const now = new Date().toISOString();
  const estimatedDurationMinutes =
    input.estimatedDurationMinutes ??
    estimateRideDurationMinutes(
      input.fromCityId,
      input.toCityId,
      input.stops.map((s) => s.cityId),
    );

  const { data, error } = await ridesSupabase
    .from('ride_trips')
    .insert({
      driver_id: userId,
      vehicle_id: input.vehicleId,
      region_id: input.regionId,
      from_city_id: input.fromCityId,
      to_city_id: input.toCityId,
      from_lat: fromCoords?.lat ?? null,
      from_lng: fromCoords?.lng ?? null,
      to_lat: toCoords?.lat ?? null,
      to_lng: toCoords?.lng ?? null,
      meeting_point: input.meetingPoint?.trim() || null,
      dropoff_point: input.dropoffPoint?.trim() || null,
      trip_type: input.tripType,
      contribution_cents: input.contributionCents,
      seats_total: input.seatsTotal,
      available_seats: input.seatsTotal,
      departure_date: input.departureDate,
      departure_time: normalizeRideDepartureTime(input.departureTime),
      estimated_duration_minutes: estimatedDurationMinutes,
      description: input.description?.trim() || null,
      luggage: input.luggage,
      smoking_allowed: input.smokingAllowed,
      pets_allowed: input.petsAllowed,
      women_only: input.womenOnly,
      music_preference: input.musicPreference,
      status: publishing ? 'published' : 'draft',
      published_at: publishing ? now : null,
    })
    .select('id')
    .single();

  if (error) return { tripId: null, error: supabaseErrorMessage(error)! };
  const tripId = (data as { id: string }).id;

  if (input.stops.length) {
    const stopRows = input.stops.map((s, i) => {
      const coords = cityCoords(s.cityId);
      return {
        trip_id: tripId,
        city_id: s.cityId,
        stop_order: i + 1,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
    });
    const { error: stopError } = await ridesSupabase.from('ride_trip_stops').insert(stopRows);
    if (stopError) return { tripId, error: stopError.message };
  }

  if (publishing) {
    const verified = await assertTripPublished(tripId);
    if (verified.error) return { tripId, error: verified.error };
  }

  return { tripId, error: null };
}

export async function updateRideTripDraft(tripId: string, input: UpdateTripDraftInput): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('update_ride_trip_draft', {
    p_trip_id: tripId,
    p_vehicle_id: input.vehicleId,
    p_from_city_id: input.fromCityId,
    p_to_city_id: input.toCityId,
    p_meeting_point: input.meetingPoint ?? null,
    p_trip_type: input.tripType,
    p_contribution_cents: input.contributionCents,
    p_seats_total: input.seatsTotal,
    p_departure_date: input.departureDate,
    p_departure_time: input.departureTime,
    p_description: input.description ?? null,
    p_luggage: input.luggage,
    p_smoking_allowed: input.smokingAllowed,
    p_pets_allowed: input.petsAllowed,
    p_women_only: input.womenOnly,
    p_music_preference: input.musicPreference,
    p_stop_city_ids: input.stops.map((s) => s.cityId),
  });
  return { error: supabaseErrorMessage(error) };
}

export async function publishRideTrip(tripId: string): Promise<{ error: string | null }> {
  return publishRideTripRecord(tripId);
}

export async function incrementRideTripView(tripId: string): Promise<void> {
  await ridesSupabase.rpc('increment_ride_trip_view', { p_trip_id: tripId });
}

export async function startRideTrip(tripId: string): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('start_ride_trip', { p_trip_id: tripId });
  return { error: error ? rideErrorMessage(supabaseErrorMessage(error) ?? undefined) : null };
}

export async function completeRideTrip(tripId: string): Promise<{ error: string | null }> {
  const reservations = await fetchTripReservations(tripId);
  const needsStripeCharge = reservations.some(
    (r) => r.status === 'approved' && r.paymentStatus === 'card_saved',
  );

  if (!needsStripeCharge) {
    const { error } = await ridesSupabase.rpc('complete_ride_trip', { p_trip_id: tripId });
    return { error: error ? rideErrorMessage(supabaseErrorMessage(error) ?? undefined) : null };
  }

  const { supabase } = await import('@/lib/supabase/client');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string; failures?: Array<{ error?: string }> }>(
    'stripe-complete-ride-trip',
    { body: { tripId } },
  );

  if (!error) {
    if (data?.error) return { error: rideErrorMessage(data.error) };
    return { error: null };
  }

  return { error: await edgeFunctionErrorMessage(error, data, { domain: 'rides' }) };
}

export async function cancelRideTrip(tripId: string, reason?: string): Promise<{ error: string | null }> {
  const { error } = await ridesSupabase.rpc('cancel_ride_trip', { p_trip_id: tripId, p_reason: reason ?? null });
  return { error: error ? rideErrorMessage(supabaseErrorMessage(error) ?? undefined) : null };
}

export async function fetchTripReservations(tripId: string): Promise<import('@/features/rides/types').RideReservation[]> {
  const { data, error } = await ridesSupabase
    .from('ride_reservations')
    .select(`
      id, trip_id, passenger_id, seat_count, status, payment_status,
      amount_cents, commission_cents, driver_payout_cents, pickup_stop_id,
      passenger_note, passenger_first_name, passenger_last_name, passenger_age, passenger_gender,
      approved_at, cancelled_at, completed_at, created_at,
      profiles!ride_reservations_passenger_id_fkey (full_name, username, avatar_url)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) return [];

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const p = profile as { full_name?: string; username?: string; avatar_url?: string } | null;
    return {
      id: row.id as string,
      tripId: row.trip_id as string,
      passengerId: row.passenger_id as string,
      seatCount: row.seat_count as number,
      status: row.status as import('@/features/rides/types').RideReservationStatus,
      paymentStatus: row.payment_status as import('@/features/rides/types').RidePaymentStatus,
      amountCents: row.amount_cents as number,
      commissionCents: row.commission_cents as number,
      driverPayoutCents: row.driver_payout_cents as number,
      pickupStopId: row.pickup_stop_id as string | null,
      passengerNote: row.passenger_note as string | null,
      passengerFirstName: (row.passenger_first_name as string | null) ?? null,
      passengerLastName: (row.passenger_last_name as string | null) ?? null,
      passengerAge: (row.passenger_age as number | null) ?? null,
      passengerGender: (row.passenger_gender as import('@/constants/registration').GenderId | null) ?? null,
      approvedAt: row.approved_at as string | null,
      cancelledAt: row.cancelled_at as string | null,
      completedAt: row.completed_at as string | null,
      createdAt: row.created_at as string,
      passengerName: p?.full_name ?? null,
      passengerUsername: p?.username ?? null,
      passengerAvatarUrl: p?.avatar_url ?? null,
    };
  });
}

export async function fetchDriverAverageRating(driverId: string): Promise<number | null> {
  const { data } = await ridesSupabase
    .from('ride_reviews')
    .select('rating')
    .eq('reviewed_user_id', driverId)
    .eq('role', 'passenger_to_driver');

  if (!data?.length) return null;
  const sum = (data as { rating: number }[]).reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / data.length) * 10) / 10;
}
