import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

    if (!muxTokenId || !muxTokenSecret) {
      return json({ error: 'Mux credentials missing' }, 500);
    }

    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policies: ['public'],
          // Mux geçerli değerler: basic | plus | premium ("standard" geçersiz)
          video_quality: 'plus',
        },
        cors_origin: '*',
      }),
    });

    const muxData = await muxResponse.json();

    if (!muxResponse.ok) {
      const muxMessage =
        typeof muxData?.error?.messages?.[0] === 'string'
          ? muxData.error.messages[0]
          : typeof muxData?.error?.type === 'string'
            ? muxData.error.type
            : 'Mux upload oluşturulamadı';
      return json({ error: muxMessage }, muxResponse.status >= 400 && muxResponse.status < 500 ? muxResponse.status : 502);
    }

    return json({
      uploadUrl: muxData.data.url,
      uploadId: muxData.data.id,
      assetId: muxData.data.asset_id ?? null,
      status: muxData.data.status,
    });
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
