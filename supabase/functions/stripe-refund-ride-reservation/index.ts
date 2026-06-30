import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type RefundBody = {
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
      return new Response(JSON.stringify({ error: 'Oturum gerekli' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;
    const body = (await req.json()) as RefundBody;
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
        id, passenger_id, status, payment_status, stripe_payment_intent_id, amount_cents,
        ride_trips (driver_id)
      `)
      .eq('id', reservationId)
      .maybeSingle();

    if (resError || !reservation) {
      return new Response(JSON.stringify({ error: 'Rezervasyon bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripRaw = reservation.ride_trips as { driver_id: string } | { driver_id: string }[] | null;
    const trip = Array.isArray(tripRaw) ? tripRaw[0] : tripRaw;
    const driverId = trip?.driver_id ?? null;

    const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    const isPassenger =
      reservation.passenger_id === userId &&
      reservation.status === 'cancelled' &&
      reservation.payment_status === 'refund_pending';
    const isDriver =
      driverId === userId &&
      reservation.status === 'rejected' &&
      reservation.payment_status === 'refund_pending';

    if (!isPassenger && !isDriver && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Bu iade için yetkiniz yok' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reservation.payment_status === 'refunded') {
      return new Response(JSON.stringify({ ok: true, already_refunded: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['held', 'refund_pending'].includes(reservation.payment_status)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntentId = reservation.stripe_payment_intent_id as string | null;
    if (!paymentIntentId) {
      await admin.rpc('finalize_ride_reservation_refund', { p_reservation_id: reservationId });
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_payment_intent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    const { error: finalizeError } = await admin.rpc('finalize_ride_reservation_refund', {
      p_reservation_id: reservationId,
    });

    if (finalizeError) {
      console.error('finalize_ride_reservation_refund failed:', finalizeError.message);
      return new Response(
        JSON.stringify({
          error: 'Stripe iadesi oluştu ancak kayıt güncellenemedi. Destek ekibine bildirin.',
          refund_id: refund.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        refund_id: refund.id,
        amount_cents: reservation.amount_cents,
        message: 'Ödemeniz iade edildi',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
