import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

type ChargeRideReservationInput = {
  admin: SupabaseClient;
  stripe: Stripe;
  reservationId: string;
  tripId: string;
  passengerId: string;
  amountCents: number;
  paymentMethodId: string;
};

export type ChargeRideReservationResult =
  | { ok: true; paymentIntentId: string; chargeId: string | null }
  | { ok: false; error: string };

export async function chargeRideReservation({
  admin,
  stripe,
  reservationId,
  tripId,
  passengerId,
  amountCents,
  paymentMethodId,
}: ChargeRideReservationInput): Promise<ChargeRideReservationResult> {
  const { data: passengerProfile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', passengerId)
    .maybeSingle();

  const customerId = passengerProfile?.stripe_customer_id as string | null;
  if (!customerId) {
    return { ok: false, error: 'Stripe müşteri kaydı bulunamadı' };
  }

  await admin
    .from('ride_reservations')
    .update({ payment_status: 'charge_pending', updated_at: new Date().toISOString() })
    .eq('id', reservationId);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'try',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        checkout_type: 'ride_reservation',
        reservation_id: reservationId,
        trip_id: tripId,
        passenger_id: passengerId,
        charge_context: 'driver_approval',
      },
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Ödeme durumu: ${paymentIntent.status}`);
    }

    const chargeId = typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? null;

    const { error: finalizeError } = await admin.rpc('finalize_ride_reservation_charge', {
      p_reservation_id: reservationId,
      p_payment_intent_id: paymentIntent.id,
      p_charge_id: chargeId,
    });

    if (finalizeError) {
      return { ok: false, error: finalizeError.message };
    }

    return { ok: true, paymentIntentId: paymentIntent.id, chargeId };
  } catch (chargeError) {
    const message = chargeError instanceof Error ? chargeError.message : String(chargeError);
    await admin.rpc('mark_ride_reservation_charge_failed', {
      p_reservation_id: reservationId,
      p_reason: message,
    });
    return { ok: false, error: message };
  }
}
