import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationEventType = string;

type SendPayload = {
  recipientId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actorId?: string;
  data?: Record<string, unknown>;
};

const PREF_MAP: Record<string, string> = {
  like: 'likes',
  comment: 'comments',
  comment_reply: 'comments',
  quote: 'likes',
  follow: 'follows',
  friend_request: 'friend_requests',
  friend_accepted: 'friend_requests',
  message: 'messages',
  mention: 'mentions',
  reel_like: 'likes',
  emergency: 'emergency',
  job: 'jobs',
  event_nearby: 'nearby_events',
  incident_update: 'nearby_events',
  call_incoming: 'messages',
  save: 'likes',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = (await req.json()) as SendPayload;
    const { recipientId, eventType, title, body, actorId, data = {} } = payload;

    if (!recipientId || !eventType || !title || !body) {
      return json({ error: 'Eksik alanlar' }, 400);
    }

    if (actorId && actorId === recipientId) {
      return json({ ok: true, skipped: 'self' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', recipientId)
      .maybeSingle();

    const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
    const prefKey = PREF_MAP[eventType];
    if (prefKey && prefs[prefKey] === false) {
      return json({ ok: true, skipped: 'prefs' });
    }

    const { data: soundSetting } = await supabase
      .from('notification_sound_settings')
      .select('sound_filename, is_custom_enabled, sound_url')
      .eq('event_type', eventType)
      .maybeSingle();

    const useCustom = soundSetting?.is_custom_enabled && soundSetting?.sound_filename;
    const sound = useCustom ? soundSetting.sound_filename.replace(/\.[^.]+$/, '') : 'default';
    const channelId = `vora_${eventType}`;

    await supabase.from('notifications').insert({
      user_id: recipientId,
      event_type: eventType,
      title,
      body,
      actor_id: actorId ?? null,
      data,
    });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token, device_push_token, platform')
      .eq('user_id', recipientId)
      .eq('is_active', true);

    const results: unknown[] = [];

    const expoTokens = (tokens ?? [])
      .map((t) => t.expo_push_token)
      .filter((t): t is string => !!t);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map((to) => ({
        to,
        title,
        body,
        sound: useCustom ? sound : 'default',
        data: { ...data, eventType, actorId, useCustomSound: !!useCustom },
        channelId,
        priority: 'high' as const,
      }));

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      results.push(await expoRes.json());
    }

    for (const token of tokens ?? []) {
      if (!token.device_push_token) continue;

      if (token.platform === 'android') {
        const fcmResult = await sendFcm(
          token.device_push_token,
          title,
          body,
          channelId,
          useCustom ? sound : undefined,
          { ...data, eventType },
        );
        if (fcmResult) results.push(fcmResult);
      }

      if (token.platform === 'ios') {
        const apnsResult = await sendApns(
          token.device_push_token,
          title,
          body,
          useCustom ? `${sound}.caf` : 'default',
          { ...data, eventType },
        );
        if (apnsResult) results.push(apnsResult);
      }
    }

    return json({ ok: true, results });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

async function sendFcm(
  token: string,
  title: string,
  body: string,
  channelId: string,
  sound: string | undefined,
  data: Record<string, unknown>,
): Promise<unknown | null> {
  const serverKey = Deno.env.get('FIREBASE_SERVER_KEY');
  if (!serverKey) return null;

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      priority: 'high',
      notification: {
        title,
        body,
        sound: sound ?? 'default',
        android_channel_id: channelId,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)]),
      ),
    }),
  });

  return res.json();
}

async function sendApns(
  token: string,
  title: string,
  body: string,
  sound: string,
  data: Record<string, unknown>,
): Promise<unknown | null> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyContent = Deno.env.get('APNS_AUTH_KEY');
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.karadeniz.dijitalagi';

  if (!keyId || !teamId || !keyContent) return null;

  const jwt = await createApnsJwt(keyId, teamId, keyContent);
  const host = Deno.env.get('APNS_PRODUCTION') === 'true'
    ? 'api.push.apple.com'
    : 'api.sandbox.push.apple.com';

  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title, body },
        sound,
        'mutable-content': 1,
      },
      ...data,
    }),
  });

  return { status: res.status, apns: true };
}

async function createApnsJwt(keyId: string, teamId: string, keyPem: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ iss: teamId, iat: now }));
  const unsigned = `${header}.${payload}`;

  const keyData = keyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsigned}.${sigB64}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
