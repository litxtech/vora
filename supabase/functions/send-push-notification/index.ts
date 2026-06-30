import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { authorizeClientPush } from '../_shared/clientPushAuthorization.ts';
import { jsonSafeError } from '../_shared/supabaseAuth.ts';
import {
  enrichPushDataWithActor,
  getCombinedUnreadBadgeCount,
  isInQuietHours,
  isPrefEnabled,
  claimMessagePush,
  releaseMessagePush,
  MESSAGE_PUSH_EVENT_TYPES,
  sendPushToDevices,
  evaluateExpoPushDelivery,
  collectInvalidExpoPushTokens,
  soundSlug,
  type QuietHours,
} from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SendPayload = {
  recipientId: string;
  eventType: string;
  title: string;
  body: string;
  actorId?: string;
  data?: Record<string, unknown>;
  pushOnly?: boolean;
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
      return json({ error: 'Unauthorized' }, 401);
    }

    const actorId = authData.user.id;
    const payload = (await req.json()) as SendPayload;
    const { recipientId, eventType, title, body, data = {}, pushOnly = false } = payload;

    if (!recipientId || !eventType || !title || !body) {
      return json({ error: 'Eksik alanlar' }, 400);
    }

    if (payload.actorId && payload.actorId !== actorId) {
      return json({ error: 'Actor mismatch' }, 403);
    }

    const authResult = await authorizeClientPush(admin, actorId, {
      recipientId,
      eventType,
      actorId,
      data,
    });

    if (!authResult.ok) {
      return json({ error: authResult.error }, authResult.status);
    }

    if (actorId === recipientId) {
      return json({ ok: true, skipped: 'self' });
    }

    const messageId =
      typeof data.message_id === 'string'
        ? data.message_id
        : typeof data.messageId === 'string'
          ? data.messageId
          : null;

    const isMessagePush = MESSAGE_PUSH_EVENT_TYPES.has(eventType) && !!messageId;
    if (isMessagePush) {
      const claimed = await claimMessagePush(admin, recipientId, messageId!);
      if (!claimed) {
        return json({ ok: true, skipped: 'already_sent' });
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('notification_prefs, quiet_hours')
      .eq('id', recipientId)
      .maybeSingle();

    const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
    const quietHours = (profile?.quiet_hours ?? {}) as QuietHours;

    if (!isPrefEnabled(prefs, eventType)) {
      if (isMessagePush) await releaseMessagePush(admin, recipientId, messageId!);
      return json({ ok: true, skipped: 'prefs' });
    }

    if (isInQuietHours(quietHours, eventType)) {
      if (isMessagePush) await releaseMessagePush(admin, recipientId, messageId!);
      return json({ ok: true, skipped: 'quiet_hours' });
    }

    const { data: soundSetting } = await admin
      .from('notification_sound_settings')
      .select('sound_filename, is_custom_enabled, sound_url')
      .eq('event_type', eventType)
      .maybeSingle();

    const useCustom = !!(soundSetting?.is_custom_enabled && soundSetting?.sound_filename);
    const slug = useCustom ? soundSlug(soundSetting!.sound_filename) : '';
    const fullFilename = useCustom ? soundSetting!.sound_filename! : '';
    const channelId = `vora_${eventType}`;

    const pushData: Record<string, unknown> = await enrichPushDataWithActor(
      admin,
      {
        ...data,
        eventType,
        actorId,
        useCustomSound: useCustom,
        soundFilename: fullFilename,
        soundUrl: useCustom ? soundSetting!.sound_url : null,
        channelId,
      },
      actorId,
    );

    if (!pushOnly) {
      const { data: inserted } = await admin
        .from('notifications')
        .insert({
          user_id: recipientId,
          event_type: eventType,
          title,
          body,
          actor_id: actorId,
          data: pushData,
        })
        .select('id')
        .single();

      if (inserted?.id) {
        pushData.notificationId = inserted.id;
      }
    }

    const [{ data: tokens }, badgeCount] = await Promise.all([
      admin
        .from('push_tokens')
        .select('expo_push_token, device_push_token, platform')
        .eq('user_id', recipientId)
        .eq('is_active', true),
      getCombinedUnreadBadgeCount(admin, recipientId),
    ]);

    const activeTokens = tokens ?? [];

    if (activeTokens.length === 0) {
      if (isMessagePush) await releaseMessagePush(admin, recipientId, messageId!);
      return json({ ok: true, skipped: 'no_tokens' });
    }

    const results = await sendPushToDevices(activeTokens, {
      title,
      body,
      channelId,
      useCustom,
      slug,
      fullFilename,
      pushData,
      badgeCount,
    });

    const expoEntries = activeTokens.filter((t) => !!t.expo_push_token);
    const expoBatch = Array.isArray(results)
      ? results.find((entry) => entry && typeof entry === 'object' && 'data' in (entry as object))
      : null;
    const delivery = evaluateExpoPushDelivery(expoEntries, expoBatch ?? results[0]);

    if (!delivery.delivered) {
      if (isMessagePush) await releaseMessagePush(admin, recipientId, messageId!);
      return json({
        ok: false,
        skipped: 'push_failed',
        errors: delivery.errors,
      });
    }

    const invalidExpoTokens = collectInvalidExpoPushTokens(
      expoEntries,
      expoBatch ?? results[0],
    );
    if (invalidExpoTokens.length > 0) {
      await admin
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('expo_push_token', invalidExpoTokens);
    }

    return json({ ok: true, sound: useCustom ? fullFilename : null, results, delivery });
  } catch (err) {
    return jsonSafeError(err, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
