import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type RideCheckoutBody = {
  tripId?: string;
  reservationId?: string;
  seatCount?: number;
  passengerNote?: string;
  successUrl?: string;
  cancelUrl?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;
    const body = (await req.json()) as RideCheckoutBody;

    let reservationId = body.reservationId ?? null;

    if (!reservationId) {
      return new Response(JSON.stringify({ error: 'Rezervasyon kaydı bulunamadı. Önce talep oluşturun.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: reservation, error: resError } = await admin
      .from('ride_reservations')
      .select(`
        id, trip_id, passenger_id, seat_count, amount_cents, commission_cents, driver_payout_cents,
        payment_status, status,
        ride_trips (id, from_city_id, to_city_id, driver_id, departure_date, departure_time, status)
      `)
      .eq('id', reservationId)
      .maybeSingle();

    if (resError || !reservation) {
      return new Response(JSON.stringify({ error: 'Rezervasyon bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reservation.passenger_id !== userId) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reservation.payment_status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Bu rezervasyon için ödeme zaten yapıldı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trip = reservation.ride_trips as {
      id: string;
      from_city_id: string;
      to_city_id: string;
      driver_id: string;
      departure_date: string;
      departure_time: string;
      status: string;
    };

    if (!trip || !['published', 'full'].includes(trip.status)) {
      return new Response(JSON.stringify({ error: 'Yolculuk rezervasyona kapalı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trip.driver_id === userId) {
      return new Response(JSON.stringify({ error: 'Kendi yolculuğunuza rezervasyon yapamazsınız' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountCents = reservation.amount_cents as number;
    if (amountCents < 5000) {
      return new Response(JSON.stringify({ error: 'Minimum güvenli ödeme tutarı ₺50' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, username, full_name')
      .eq('id', userId)
      .maybeSingle();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authData.user.email ?? undefined,
        name: profile?.full_name ?? profile?.username ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const successUrl = body.successUrl ?? `vora://detail/rides/${trip.id}?checkout=success`;
    const cancelUrl = body.cancelUrl ?? `vora://detail/rides/${trip.id}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      custom_text: {
        submit: {
          message:
            'Kartınız doğrulanır. Katkı payı şoför onayında tahsil edilir; red durumunda ücret çekilmez.',
        },
      },
      metadata: {
        user_id: userId,
        trip_id: trip.id,
        reservation_id: reservationId,
        driver_id: trip.driver_id,
        checkout_type: 'ride_reservation',
        amount_cents: String(amountCents),
      },
    });

    await admin
      .from('ride_reservations')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    return new Response(JSON.stringify({ url: session.url, reservationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
