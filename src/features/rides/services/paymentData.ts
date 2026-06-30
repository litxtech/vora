import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import type { RidePassengerDetailsInput } from '@/features/rides/services/reservationData';
import { rideErrorMessage, edgeFunctionErrorMessage } from '@/lib/errors';

function checkoutReturnUrl(tripId: string, result: 'success' | 'cancelled'): string {
  return Linking.createURL(`detail/rides/${tripId}`, { queryParams: { checkout: result } });
}

async function resolvePendingReservationId(
  tripId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('ride_reservations')
    .select('id')
    .eq('trip_id', tripId)
    .eq('passenger_id', userId)
    .eq('status', 'pending')
    .in('payment_status', ['pending', 'card_saved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function startRideCheckout(input: {
  tripId: string;
  seatCount: number;
  passenger: RidePassengerDetailsInput;
  reservationId?: string;
}): Promise<{ reservationId: string | null; error: string | null }> {
  const { requestReservation } = await import('@/features/rides/services/reservationData');
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  let reservationId = input.reservationId ?? null;

  if (!reservationId && userId) {
    reservationId = await resolvePendingReservationId(input.tripId, userId);
  }

  if (!reservationId) {
    const created = await requestReservation(input.tripId, input.seatCount, input.passenger);
    if (created.error || !created.reservationId) {
      if (userId && created.error?.includes('aktif bir rezervasyon')) {
        reservationId = await resolvePendingReservationId(input.tripId, userId);
      }
      if (!reservationId) {
        return { reservationId: null, error: rideErrorMessage(created.error ?? 'Rezervasyon oluşturulamadı') };
      }
    } else {
      reservationId = created.reservationId;
    }
  }

  const { data, error } = await supabase.functions.invoke<{ url?: string; reservationId?: string; error?: string }>(
    'stripe-create-ride-checkout',
    {
      body: {
        tripId: input.tripId,
        seatCount: input.seatCount,
        passengerNote: input.passenger.note,
        reservationId,
        successUrl: checkoutReturnUrl(input.tripId, 'success'),
        cancelUrl: checkoutReturnUrl(input.tripId, 'cancelled'),
      },
    },
  );

  if (error) {
    return { reservationId: null, error: await edgeFunctionErrorMessage(error, data, { domain: 'rides' }) };
  }
  if (data?.error) return { reservationId: null, error: rideErrorMessage(data.error) };
  if (!data?.url) return { reservationId: null, error: 'Kart doğrulama sayfası açılamadı.' };

  await WebBrowser.openAuthSessionAsync(data.url, checkoutReturnUrl(input.tripId, 'success'));
  return { reservationId: reservationId ?? data.reservationId ?? null, error: null };
}
