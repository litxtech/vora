import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { RtcRole, RtcTokenBuilder } from 'npm:agora-access-token@2.0.4';
import { jsonSafeError } from '../_shared/supabaseAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_TTL_SECONDS = 3600;
const CHANNEL_NAME_PATTERN = /^kd_[a-z0-9_-]{8,120}$/i;

type TokenBody = {
  channelName?: string;
  sessionId?: string;
  callType?: 'audio' | 'video';
  uid?: number;
};

function uidFromUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2_147_483_647 || 1;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!appId || !appCertificate) {
      return json({ error: 'Agora credentials missing' }, 500);
    }
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'Supabase credentials missing' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userId = authData.user.id;
    const body = (await req.json()) as TokenBody;
    const channelName = body.channelName?.trim();
    const sessionId = body.sessionId?.trim();

    if (!channelName || !CHANNEL_NAME_PATTERN.test(channelName)) {
      return json({ error: 'Invalid channelName' }, 400);
    }
    if (!sessionId) {
      return json({ error: 'sessionId required' }, 400);
    }

    const { data: session, error: sessionError } = await admin
      .from('call_sessions')
      .select('id, channel_name, caller_id, callee_id, call_type, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return json({ error: 'Call session not found' }, 404);
    }

    if (session.channel_name !== channelName) {
      return json({ error: 'Channel mismatch' }, 403);
    }

    if (session.caller_id !== userId && session.callee_id !== userId) {
      return json({ error: 'Forbidden' }, 403);
    }

    if (session.status !== 'accepted') {
      return json({ error: 'Call is not active' }, 403);
    }

    if (body.callType && body.callType !== session.call_type) {
      return json({ error: 'Call type mismatch' }, 403);
    }

    const uid = uidFromUserId(userId);
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiresAt,
    );

    return json({
      token,
      channelName,
      uid,
      expiresAt,
      appId,
    });
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
