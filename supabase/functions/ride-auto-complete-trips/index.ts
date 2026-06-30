import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { completeRideTripWithCharges } from '../_shared/completeRideTrip.ts';
import { corsHeaders, getStripe } from '../_shared/stripe.ts';

type AutoCompleteBody = {
  batch_size?: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token !== serviceKey) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as AutoCompleteBody;
    const batchSize = Math.min(Math.max(body.batch_size ?? 20, 1), 50);

    const admin = createClient(supabaseUrl, serviceKey);
    const stripe = getStripe();

    const { data: dueTrips, error: listError } = await admin.rpc('ride_trips_due_for_auto_complete', {
      p_limit: batchSize,
    });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trips = (dueTrips ?? []) as Array<{ id: string; driver_id: string }>;
    const results: Array<{ tripId: string; ok: boolean; error?: string }> = [];

    for (const trip of trips) {
      const result = await completeRideTripWithCharges(
        admin,
        stripe,
        trip.id,
        trip.driver_id,
        true,
      );
      results.push({
        tripId: trip.id,
        ok: result.ok,
        error: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
