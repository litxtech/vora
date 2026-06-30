import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  collectInvalidExpoPushTokens,
  completeOutboxItem,
  enrichPushDataWithActor,
  evaluateExpoPushDelivery,
  getCombinedUnreadBadgeCount,
  isInQuietHours,
  isPrefEnabled,
  claimMessagePush,
  releaseMessagePush,
  MESSAGE_PUSH_EVENT_TYPES,
  releaseOutboxClaim,
  sendPushToDevices,
  soundSlug,
  type QuietHours,
} from '../_shared/notifications.ts';
import { jsonSafeError } from '../_shared/supabaseAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OutboxRow = {
  id: string;
  recipient_id: string;
  event_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  actor_id: string | null;
  processed_at: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await authorizeOutboxProcessor(req);
    if (auth instanceof Response) return auth;

    const supabase = auth.admin;

    const body = await req.json().catch(() => ({}));
    const outboxId = body.outbox_id as string | undefined;
    const batchSize = Math.min(Number(body.batch_size) || 25, 100);

    const { data: rows, error } = await supabase.rpc('claim_notification_outbox_items', {
      p_outbox_id: outboxId ?? null,
      p_batch_size: batchSize,
    });
    if (error) return json({ error: error.message }, 500);

    const results: unknown[] = [];

    for (const row of (rows ?? []) as OutboxRow[]) {
      const result = await processOutboxItem(supabase, row);
      results.push(result);
    }

    return json({ ok: true, processed: results.length, results });
  } catch (err) {
    return jsonSafeError(err, 500);
  }
});

async function processOutboxItem(
  supabase: ReturnType<typeof createClient>,
  row: OutboxRow,
): Promise<unknown> {
  try {
    const messageId =
      typeof row.data?.message_id === 'string' ? row.data.message_id : null;

    if (row.actor_id && row.actor_id === row.recipient_id) {
      await releaseOutboxClaim(supabase, row.id);
      return { id: row.id, skipped: 'self' };
    }

    const isMessagePush = MESSAGE_PUSH_EVENT_TYPES.has(row.event_type) && !!messageId;
    if (isMessagePush) {
      const claimed = await claimMessagePush(supabase, row.recipient_id, messageId!);
      if (!claimed) {
        await completeOutboxItem(supabase, row.id);
        return { id: row.id, skipped: 'already_sent' };
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_prefs, quiet_hours')
      .eq('id', row.recipient_id)
      .maybeSingle();

    const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
    const quietHours = (profile?.quiet_hours ?? {}) as QuietHours;

    if (!isPrefEnabled(prefs, row.event_type)) {
      if (isMessagePush) await releaseMessagePush(supabase, row.recipient_id, messageId!);
      await releaseOutboxClaim(supabase, row.id);
      return { id: row.id, skipped: 'prefs' };
    }

    if (isInQuietHours(quietHours, row.event_type)) {
      if (isMessagePush) await releaseMessagePush(supabase, row.recipient_id, messageId!);
      await releaseOutboxClaim(supabase, row.id);
      return { id: row.id, skipped: 'quiet_hours' };
    }

    const { data: soundSetting } = await supabase
      .from('notification_sound_settings')
      .select('sound_filename, is_custom_enabled, sound_url')
      .eq('event_type', row.event_type)
      .maybeSingle();

    const useCustom = !!(soundSetting?.is_custom_enabled && soundSetting?.sound_filename);
    const slug = useCustom ? soundSlug(soundSetting!.sound_filename) : '';
    const fullFilename = useCustom ? soundSetting!.sound_filename! : '';
    const channelId = `vora_${row.event_type}`;

    const pushData = await enrichPushDataWithActor(
      supabase,
      {
        ...(row.data ?? {}),
        eventType: row.event_type,
        actorId: row.actor_id ?? null,
        recipientId: row.recipient_id,
        useCustomSound: useCustom,
        soundFilename: fullFilename,
        soundUrl: useCustom ? soundSetting!.sound_url : null,
        channelId,
        outboxId: row.id,
      },
      row.actor_id,
    );

    const [{ data: tokens }, badgeCount] = await Promise.all([
      supabase
        .from('push_tokens')
        .select('expo_push_token, device_push_token, platform')
        .eq('user_id', row.recipient_id)
        .eq('is_active', true),
      getCombinedUnreadBadgeCount(supabase, row.recipient_id),
    ]);

    const activeTokens = tokens ?? [];

    if (activeTokens.length === 0) {
      if (isMessagePush) await releaseMessagePush(supabase, row.recipient_id, messageId!);
      await releaseOutboxClaim(supabase, row.id);
      return { id: row.id, skipped: 'no_tokens' };
    }

    const pushResults = await sendPushToDevices(activeTokens, {
      title: row.title,
      body: row.body,
      channelId,
      useCustom,
      slug,
      fullFilename,
      pushData,
      badgeCount,
    });

    const expoEntries = activeTokens.filter((t) => !!t.expo_push_token);
    const expoBatch = Array.isArray(pushResults)
      ? pushResults.find((entry) => entry && typeof entry === 'object' && 'data' in (entry as object))
      : null;
    const delivery = evaluateExpoPushDelivery(expoEntries, expoBatch ?? pushResults[0]);

    if (!delivery.delivered) {
      if (isMessagePush) await releaseMessagePush(supabase, row.recipient_id, messageId!);
      await releaseOutboxClaim(supabase, row.id);
      return {
        id: row.id,
        skipped: 'push_failed',
        errors: delivery.errors,
        okCount: delivery.okCount,
        errorCount: delivery.errorCount,
      };
    }

    const invalidExpoTokens = collectInvalidExpoPushTokens(
      expoEntries,
      expoBatch ?? pushResults[0],
    );

    if (invalidExpoTokens.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('expo_push_token', invalidExpoTokens);
    }

    if (!isMessagePush) {
      await completeOutboxItem(supabase, row.id);
    }
    // Mesaj push'u claimMessagePush sırasında processed_at ile zaten tamamlandı.

    return {
      id: row.id,
      ok: true,
      pushResults,
      invalidTokens: invalidExpoTokens.length,
      delivery,
    };
  } catch (err) {
    await releaseOutboxClaim(supabase, row.id);
    return {
      id: row.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const OUTBOX_OPERATOR_ROLES = new Set(['admin', 'super_admin', 'moderator']);

async function authorizeOutboxProcessor(
  req: Request,
): Promise<{ admin: ReturnType<typeof createClient> } | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Supabase credentials missing' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const admin = createClient(supabaseUrl, serviceKey);

  if (authHeader === `Bearer ${serviceKey}`) {
    return { admin };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Forbidden' }, 403);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!profile?.role || !OUTBOX_OPERATOR_ROLES.has(profile.role)) {
    return json({ error: 'Forbidden' }, 403);
  }

  return { admin };
}
