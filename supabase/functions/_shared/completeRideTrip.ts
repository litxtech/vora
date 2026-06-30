import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

type CompleteRideTripResult = {
  ok: boolean;
  error?: string;
  failures?: Array<{ reservationId: string; error: string }>;
  message?: string;
};

export async function completeRideTripWithCharges(
  admin: SupabaseClient,
  stripe: Stripe,
  tripId: string,
  driverId: string,
  autoCompleted: boolean,
): Promise<CompleteRideTripResult> {
  const { data: reservations, error: resError } = await admin
    .from('ride_reservations')
    .select('id, passenger_id, amount_cents, payment_status, stripe_payment_method_id, status')
    .eq('trip_id', tripId)
    .eq('status', 'approved');

  if (resError) {
    return { ok: false, error: resError.message };
  }

  const failures: Array<{ reservationId: string; error: string }> = [];
  const rows = reservations ?? [];

  if (rows.length === 0) {
    const { error: completeError } = await admin.rpc('finalize_ride_trip_completion', {
      p_trip_id: tripId,
      p_driver_id: driverId,
      p_auto_completed: autoCompleted,
    });
    if (completeError) return { ok: false, error: completeError.message };
    return { ok: true, message: 'Yolculuk tamamlandı' };
  }

  for (const reservation of rows) {
    if (reservation.payment_status === 'held') continue;

    if (reservation.payment_status !== 'card_saved') {
      failures.push({
        reservationId: reservation.id as string,
        error: `Geçersiz ödeme durumu: ${reservation.payment_status}`,
      });
      continue;
    }

    const paymentMethodId = reservation.stripe_payment_method_id as string | null;
    if (!paymentMethodId) {
      failures.push({ reservationId: reservation.id as string, error: 'Kayıtlı kart bulunamadı' });
      continue;
    }

    const { data: passengerProfile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', reservation.passenger_id)
      .maybeSingle();

    const customerId = passengerProfile?.stripe_customer_id as string | null;
    if (!customerId) {
      failures.push({ reservationId: reservation.id as string, error: 'Stripe müşteri kaydı yok' });
      continue;
    }

    await admin
      .from('ride_reservations')
      .update({ payment_status: 'charge_pending', updated_at: new Date().toISOString() })
      .eq('id', reservation.id);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: reservation.amount_cents as number,
        currency: 'try',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          checkout_type: 'ride_reservation',
          reservation_id: reservation.id as string,
          trip_id: tripId,
          passenger_id: reservation.passenger_id as string,
          auto_completed: autoCompleted ? 'true' : 'false',
        },
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Ödeme durumu: ${paymentIntent.status}`);
      }

      const chargeId = typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id ?? null;

      const { error: finalizeError } = await admin.rpc('finalize_ride_reservation_charge', {
        p_reservation_id: reservation.id,
        p_payment_intent_id: paymentIntent.id,
        p_charge_id: chargeId,
      });

      if (finalizeError) {
        failures.push({ reservationId: reservation.id as string, error: finalizeError.message });
      }
    } catch (chargeError) {
      const message = chargeError instanceof Error ? chargeError.message : String(chargeError);
      await admin.rpc('mark_ride_reservation_charge_failed', {
        p_reservation_id: reservation.id,
        p_reason: message,
      });
      failures.push({ reservationId: reservation.id as string, error: message });
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      error: 'Bazı yolculardan tahsilat alınamadı. Yolculara bildirim gönderildi.',
      failures,
    };
  }

  const { error: completeError } = await admin.rpc('finalize_ride_trip_completion', {
    p_trip_id: tripId,
    p_driver_id: driverId,
    p_auto_completed: autoCompleted,
  });

  if (completeError) {
    return { ok: false, error: completeError.message };
  }

  return {
    ok: true,
    message: autoCompleted
      ? 'Yolculuk otomatik tamamlandı ve tahsilatlar alındı'
      : 'Yolculuk tamamlandı ve tahsilatlar alındı',
  };
}
