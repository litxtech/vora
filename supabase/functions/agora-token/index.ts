import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { RtcRole, RtcTokenBuilder } from 'npm:agora-access-token@2.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_TTL_SECONDS = 3600;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      return new Response(JSON.stringify({ error: 'Agora credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { channelName, uid: requestedUid } = await req.json();

    if (!channelName || typeof channelName !== 'string') {
      return new Response(JSON.stringify({ error: 'channelName required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uid = typeof requestedUid === 'number' ? requestedUid : 0;
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiresAt,
    );

    return new Response(
      JSON.stringify({
        token,
        channelName,
        uid,
        expiresAt,
        appId,
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
