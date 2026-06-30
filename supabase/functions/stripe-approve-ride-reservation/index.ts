import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { chargeRideReservation } from '../_shared/chargeRideReservation.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type Body = {
  reservationId?: string;
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

    const body = (await req.json()) as Body;
    const reservationId = body.reservationId;
    if (!reservationId) {
      return new Response(JSON.stringify({ error: 'reservationId gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: reservation, error: resError } = await admin
      .from('ride_reservations')
      .select(`
        id, trip_id, passenger_id, amount_cents, payment_status, status, stripe_payment_method_id,
        ride_trips!inner (id, driver_id)
      `)
      .eq('id', reservationId)
      .maybeSingle();

    if (resError || !reservation) {
      return new Response(JSON.stringify({ error: 'Rezervasyon bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trip = reservation.ride_trips as { id: string; driver_id: string };
    if (trip.driver_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reservation.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Rezervasyon onaylanamaz' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentStatus = reservation.payment_status as string;

    if (paymentStatus === 'card_saved') {
      const paymentMethodId = reservation.stripe_payment_method_id as string | null;
      if (!paymentMethodId) {
        return new Response(JSON.stringify({ error: 'Kayıtlı kart bulunamadı' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const stripe = getStripe();
      const charge = await chargeRideReservation({
        admin,
        stripe,
        reservationId,
        tripId: trip.id,
        passengerId: reservation.passenger_id as string,
        amountCents: reservation.amount_cents as number,
        paymentMethodId,
      });

      if (!charge.ok) {
        return new Response(JSON.stringify({ error: charge.error }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (paymentStatus !== 'held') {
      return new Response(JSON.stringify({ error: 'Kart kaydı veya ödeme henüz tamamlanmadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: respondError } = await userClient.rpc('respond_ride_reservation', {
      p_reservation_id: reservationId,
      p_approve: true,
    });

    if (respondError) {
      return new Response(JSON.stringify({ error: respondError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
