import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

    if (!muxTokenId || !muxTokenSecret) {
      return new Response(JSON.stringify({ error: 'Mux credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
    const body = await req.json();

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ['public'],
          encoding_tier: 'baseline',
          max_resolution_tier: '1080p',
        },
        cors_origin: '*',
      }),
    });

    const muxData = await muxResponse.json();

    if (!muxResponse.ok) {
      return new Response(JSON.stringify(muxData), {
        status: muxResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        uploadId: muxData.data.url,
        assetId: muxData.data.asset_id,
        status: muxData.data.status,
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
