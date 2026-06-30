import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { completeRideTripWithCharges } from '../_shared/completeRideTrip.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type CompleteBody = {
  tripId?: string;
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
    const body = (await req.json()) as CompleteBody;
    const tripId = body.tripId;

    if (!tripId) {
      return new Response(JSON.stringify({ error: 'tripId gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: trip, error: tripError } = await admin
      .from('ride_trips')
      .select('id, driver_id, status')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: 'Yolculuk bulunamadı' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trip.driver_id !== userId) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trip.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: 'Yolculuk devam etmiyor' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    const result = await completeRideTripWithCharges(admin, stripe, tripId, userId, false);

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          error: result.error,
          failures: result.failures,
        }),
        { status: result.failures?.length ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true, message: result.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
