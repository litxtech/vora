import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AccessToken } from 'npm:livekit-server-sdk@2.9.1';
import { jsonSafeError } from '../_shared/supabaseAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TokenBody = {
  roomId?: string;
  roomName?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!livekitUrl || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'LiveKit credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const body = (await req.json()) as TokenBody;
    const roomId = body.roomId?.trim();

    if (!roomId) {
      return new Response(JSON.stringify({ error: 'roomId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: room, error: roomError } = await admin
      .from('city_voice_rooms')
      .select('id, livekit_room_name, status, region_ids')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.status !== 'live') {
      return new Response(JSON.stringify({ error: 'Room not live' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: participant } = await admin
      .from('city_voice_room_participants')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle();

    if (!participant) {
      return new Response(JSON.stringify({ error: 'Join room first' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const canPublish = ['speaker', 'city_leader', 'council_member', 'moderator', 'admin'].includes(
      participant.role,
    );

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      ttl: '1h',
    });
    at.addGrant({
      roomJoin: true,
      room: room.livekit_room_name,
      canPublish,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({
        token,
        url: livekitUrl,
        roomName: room.livekit_room_name,
        canPublish,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
