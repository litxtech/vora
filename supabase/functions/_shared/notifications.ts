import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type QuietHours = {
  enabled?: boolean;
  start?: string;
  end?: string;
  timezone?: string;
};

const PREF_MAP: Record<string, string> = {
  like: 'likes',
  comment: 'comments',
  comment_reply: 'comments',
  quote: 'likes',
  share: 'likes',
  follow: 'follows',
  feed_activity: 'feed',
  friend_request: 'friend_requests',
  friend_accepted: 'friend_requests',
  account_link_request: 'system',
  account_link_accepted: 'system',
  account_link_declined: 'system',
  message: 'messages',
  group_message: 'messages',
  mention: 'mentions',
  reel_like: 'likes',
  emergency: 'emergency',
  job: 'jobs',
  event_nearby: 'nearby_events',
  event_reminder: 'nearby_events',
  incident_update: 'nearby_events',
  regional_alert: 'nearby_events',
  lost_item_nearby: 'nearby_events',
  lost_item_tip: 'nearby_events',
  call_incoming: 'messages',
  call_video: 'messages',
  call_missed: 'messages',
  save: 'likes',
  trust_score_change: 'system',
  friend_invite_referral: 'system',
  trust_milestone_80: 'system',
  trust_reward_pool: 'system',
  achievement_earned: 'system',
  badge_earned: 'system',
  izdivac_access_granted: 'system',
  izdivac_access_revoked: 'system',
  izdivac_post_comment: 'system',
  izdivac_post_join: 'system',
  izdivac_invite_received: 'system',
  izdivac_invite_accepted: 'system',
  security_alert: 'emergency',
  content_warning: 'system',
  business_post: 'businesses',
  business_campaign: 'businesses',
  business_event: 'businesses',
  channel_post: 'channels',
  system: 'system',
  marketplace_offer: 'marketplace',
  marketplace_offer_accepted: 'marketplace',
  marketplace_offer_rejected: 'marketplace',
  marketplace_order_paid: 'marketplace',
  marketplace_ship_request: 'marketplace',
  marketplace_buyer_confirm: 'marketplace',
  marketplace_platform_approved: 'marketplace',
  marketplace_payout_due: 'marketplace',
  marketplace_payout_completed: 'marketplace',
  marketplace_comment: 'marketplace',
  ride_reservation_new: 'rides',
  ride_reservation_paid: 'rides',
  ride_reservation_approved: 'rides',
  ride_reservation_rejected: 'rides',
  ride_passenger_cancelled_reservation: 'rides',
  ride_trip_cancelled: 'rides',
  ride_trip_started: 'rides',
  ride_trip_completed: 'rides',
  ride_trip_starting_soon: 'rides',
  ride_trip_departure_soon: 'rides',
  ride_trip_departure_due: 'rides',
  ride_trip_complete_soon: 'rides',
  ride_payout_due: 'rides',
  ride_payout_completed: 'rides',
  ride_live_location_shared: 'rides',
  vora_need_published: 'vora_needs',
  vora_service_request_published: 'vora_hizmetler',
  vora_service_offer_received: 'vora_hizmetler',
  vora_service_offer_accepted: 'vora_hizmetler',
  vora_service_offer_rejected: 'vora_hizmetler',
  vora_service_job_completed: 'vora_hizmetler',
  vora_service_job_started: 'vora_hizmetler',
  vora_service_completion_proof: 'vora_hizmetler',
  vora_service_payout_due: 'vora_hizmetler',
  vora_service_payout_completed: 'vora_hizmetler',
  vora_service_emergency_call: 'vora_hizmetler',
  vora_service_emergency_matched: 'vora_hizmetler',
  vora_service_live_location_shared: 'vora_hizmetler',
  vora_service_dispute_opened: 'vora_hizmetler',
  vora_service_refund_completed: 'vora_hizmetler',
  vora_service_payout_reminder: 'vora_hizmetler',
  hotel_review: 'hotels',
  hotel_reservation_paid: 'hotels',
  hotel_reservation_received: 'hotels',
  hotel_reservation_cancelled: 'hotels',
  hotel_payout_due: 'hotels',
  hotel_payout_completed: 'hotels',
  hotel_marketing_campaign: 'hotels',
};

const QUIET_HOURS_BYPASS = new Set([
  'emergency',
  'security_alert',
  'content_warning',
  'regional_alert',
  'call_incoming',
  'call_video',
  'vora_service_emergency_call',
]);

/** Kullanıcı tercihlerinden bağımsız — her zaman iletilir. */
const ALWAYS_ON_EVENTS = new Set(['content_warning', 'emergency', 'security_alert']);

export function prefKeyForEvent(eventType: string): string | undefined {
  return PREF_MAP[eventType];
}

export function isPrefEnabled(
  prefs: Record<string, boolean>,
  eventType: string,
): boolean {
  if (ALWAYS_ON_EVENTS.has(eventType)) return true;
  const prefKey = PREF_MAP[eventType];
  if (!prefKey) return true;
  return prefs[prefKey] !== false;
}

export function isInQuietHours(
  quietHours: QuietHours | null | undefined,
  eventType: string,
): boolean {
  if (QUIET_HOURS_BYPASS.has(eventType)) return false;
  if (!quietHours?.enabled) return false;

  const start = quietHours.start ?? '22:00';
  const end = quietHours.end ?? '08:00';
  const timezone = quietHours.timezone ?? 'Europe/Istanbul';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const current = `${hour}:${minute}`;

  if (start <= end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

/** Sistem varsayılan bildirim sesi (Expo push / APNs) */
export const SYSTEM_DEFAULT_PUSH_SOUND = 'default';

export const INCOMING_CALL_PUSH_CATEGORY = 'vora_incoming_call';
export const MESSAGE_PUSH_CATEGORY = 'vora_message_reply';

export function isIncomingCallPushEvent(eventType: string): boolean {
  return eventType === 'call_incoming' || eventType === 'call_video';
}

export function soundSlug(filename: string | null | undefined): string {
  if (!filename) return '';
  return filename.replace(/\.[^.]+$/, '');
}

export function soundExtension(filename: string | null | undefined): string {
  if (!filename) return 'wav';
  const match = filename.match(/\.([^.]+)$/);
  return match?.[1]?.toLowerCase() ?? 'wav';
}

/** iOS/Android push: özel ses yoksa telefon varsayılan bildirim sesi. */
export function resolveExpoPushSound(
  _platform: string,
  useCustom: boolean,
  slug: string,
): string {
  if (useCustom && slug) return slug;
  return SYSTEM_DEFAULT_PUSH_SOUND;
}

/** APNs: özel ses yoksa telefon varsayılan bildirim sesi. */
export function resolveApnsPushSound(useCustom: boolean, fullFilename: string): string {
  if (useCustom && fullFilename) return fullFilename;
  return SYSTEM_DEFAULT_PUSH_SOUND;
}

export async function getUnreadBadgeCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  return count ?? 0;
}

export async function getMessagingUnreadCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('get_messaging_unread_count', {
    p_user_id: userId,
  });
  if (!error && data != null) return Number(data);

  if (error) {
    console.warn('get_messaging_unread_count rpc failed', error.message);
  }

  return countMessagingUnreadFallback(supabase, userId);
}

/** RPC yoksa veya hata verirse: üye olunan sohbetlerdeki okunmamış mesajları say. */
async function countMessagingUnreadFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { data: memberships, error: memberError } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at, is_archived, hidden_at, conversations(last_message_at, created_at)')
    .eq('user_id', userId)
    .eq('is_archived', false);

  if (memberError || !memberships?.length) return 0;

  let total = 0;

  for (const row of memberships) {
    const conv = row.conversations as { last_message_at: string | null; created_at: string } | null;
    if (!conv) continue;

    const hiddenAt = row.hidden_at as string | null;
    const lastActivity = conv.last_message_at ?? conv.created_at;
    if (hiddenAt && lastActivity <= hiddenAt) continue;

    const lastReadAt = (row.last_read_at as string | null) ?? '1970-01-01T00:00:00.000Z';

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', row.conversation_id)
      .neq('sender_id', userId)
      .eq('deleted_for_all', false)
      .gt('created_at', lastReadAt);

    if (error) continue;
    total += count ?? 0;
  }

  return total;
}

/** Bildirim merkezi + okunmamış mesajlar (iOS rozet). */
export async function getCombinedUnreadBadgeCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const [notifUnread, messageUnread] = await Promise.all([
    getUnreadBadgeCount(supabase, userId),
    getMessagingUnreadCount(supabase, userId),
  ]);
  return notifUnread + messageUnread;
}

export const MESSAGE_PUSH_EVENT_TYPES = new Set(['message', 'group_message']);

export function messagePushAlreadySent(
  data: Record<string, unknown> | null | undefined,
): boolean {
  return typeof data?.push_sent_at === 'string' && data.push_sent_at.length > 0;
}

export async function findMessagePushOutboxRow(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  messageId: string,
) {
  const { data } = await supabase
    .from('notification_outbox')
    .select('id, data, processed_at')
    .eq('recipient_id', recipientId)
    .in('event_type', ['message', 'group_message'])
    .filter('data->>message_id', 'eq', messageId)
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Mesaj push'unu atomik olarak sahiplen. true → bu çağıran gönderecek;
 * false → başkası (istemci veya outbox işleyici) zaten sahiplendi, atla.
 */
export async function claimMessagePush(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  messageId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_message_push', {
    p_recipient_id: recipientId,
    p_message_id: messageId,
  });
  if (error) return false;
  return data === true;
}

/** Push teslimi başarısızsa sahiplenmeyi geri al (yeniden deneme için). */
export async function releaseMessagePush(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  messageId: string,
): Promise<void> {
  await supabase.rpc('release_message_push', {
    p_recipient_id: recipientId,
    p_message_id: messageId,
  });
}

export async function markMessagePushSent(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  messageId: string,
): Promise<void> {
  const row = await findMessagePushOutboxRow(supabase, recipientId, messageId);
  if (!row?.id) return;

  const merged = {
    ...(row.data ?? {}),
    push_sent_at: new Date().toISOString(),
  };

  await supabase
    .from('notification_outbox')
    .update({
      processed_at: new Date().toISOString(),
      claimed_at: null,
      data: merged,
    })
    .eq('id', row.id);
}

export async function releaseOutboxClaim(
  supabase: ReturnType<typeof createClient>,
  outboxId: string,
): Promise<void> {
  await supabase.rpc('release_notification_outbox_claim', { p_outbox_id: outboxId });
}

export async function completeOutboxItem(
  supabase: ReturnType<typeof createClient>,
  outboxId: string,
): Promise<void> {
  await supabase.rpc('complete_notification_outbox_item', { p_outbox_id: outboxId });
}

export type PushTokenRow = {
  expo_push_token: string | null;
  device_push_token: string | null;
  platform: string;
};

/** Aynı cihaz token'ına birden fazla satırdan push gitmesini engeller. */
export function dedupePushTokens(tokens: PushTokenRow[]): PushTokenRow[] {
  const seen = new Set<string>();
  const unique: PushTokenRow[] = [];

  for (const token of tokens) {
    const key = token.expo_push_token
      ? `expo:${token.expo_push_token}`
      : token.device_push_token
        ? `native:${token.platform}:${token.device_push_token}`
        : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
  }

  return unique;
}

export const VORA_APP_NAME = 'Vora';

export type BrandedPushPresentation = {
  title: string;
  subtitle?: string;
  body: string;
  imageUrl: string | null;
};

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function pickPushActorAvatarUrl(data: Record<string, unknown>): string | null {
  return pickString(data, 'actor_avatar_url', 'actorAvatarUrl');
}

/** Gönderi / reel / ilan küçük görseli — zengin bildirimde büyük ekranda gösterilir. */
export function pickPushContentImageUrl(data: Record<string, unknown>): string | null {
  const actorAvatar = pickPushActorAvatarUrl(data);
  const candidates = [
    pickString(data, 'content_image_url', 'contentImageUrl'),
    pickString(data, 'thumbnail_url', 'thumbnailUrl'),
    pickString(data, 'image_url', 'imageUrl'),
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    if (actorAvatar && url === actorAvatar) continue;
    return url;
  }
  return null;
}

function usesActorAvatarAsRichImage(eventType: string): boolean {
  return MESSAGE_PUSH_EVENT_TYPES.has(eventType) || isIncomingCallPushEvent(eventType);
}

/** Genişletilmiş push ekranı görseli: sosyalde içerik, mesajda gönderen avatarı. */
export function pickPushRichImageUrl(data: Record<string, unknown>, eventType: string): string | null {
  const content = pickPushContentImageUrl(data);
  if (content) return content;

  if (usesActorAvatarAsRichImage(eventType)) {
    return pickPushActorAvatarUrl(data) ?? pickString(data, 'image_url', 'imageUrl');
  }

  return null;
}

/** @deprecated pickPushRichImageUrl kullanın */
export function pickPushImageUrl(data: Record<string, unknown>): string | null {
  return pickPushContentImageUrl(data) ?? pickPushActorAvatarUrl(data);
}

export function pickPushHeadline(rawTitle: string, data: Record<string, unknown>): string {
  return (
    pickString(data, 'sender_name', 'senderName', 'sender_label', 'senderLabel') ??
    rawTitle.trim()
  );
}

/** Push bildirimlerinde uygulama adı Vora; gönderen/olay başlığı alt satırda (iOS) veya gövdede (Android). */
export function buildBrandedPushPresentation(
  rawTitle: string,
  rawBody: string,
  data: Record<string, unknown>,
): BrandedPushPresentation {
  const headline = pickPushHeadline(rawTitle, data);
  const eventType = String(data.eventType ?? data.event_type ?? '');
  const imageUrl = pickPushRichImageUrl(data, eventType);
  const showSubtitle = headline.length > 0 && headline !== VORA_APP_NAME;

  return {
    title: VORA_APP_NAME,
    subtitle: showSubtitle ? headline : undefined,
    body: rawBody,
    imageUrl,
  };
}

export function formatAndroidPushBody(presentation: BrandedPushPresentation): string {
  if (!presentation.subtitle) return presentation.body;
  if (presentation.body.startsWith(presentation.subtitle)) return presentation.body;
  return `${presentation.subtitle}\n${presentation.body}`;
}

export async function enrichPushDataWithActor(
  supabase: ReturnType<typeof createClient>,
  pushData: Record<string, unknown>,
  actorId: string | null | undefined,
): Promise<Record<string, unknown>> {
  if (!actorId) return pushData;

  const needsActorAvatar = !pickPushActorAvatarUrl(pushData);
  const needsSenderName = !pickString(pushData, 'sender_name', 'senderName');
  if (!needsActorAvatar && !needsSenderName) return pushData;

  const { data: actor } = await supabase
    .from('profiles')
    .select('avatar_url, full_name, username')
    .eq('id', actorId)
    .maybeSingle();

  const enriched: Record<string, unknown> = { ...pushData };

  if (needsActorAvatar && actor?.avatar_url) {
    enriched.actor_avatar_url = actor.avatar_url;
  }

  if (needsSenderName) {
    const name =
      actor?.full_name?.trim() ||
      (actor?.username ? `@${actor.username}` : null);
    if (name) enriched.sender_name = name;
  }

  return enriched;
}

export type PushPayload = {
  title: string;
  body: string;
  channelId: string;
  useCustom: boolean;
  slug: string;
  fullFilename: string;
  pushData: Record<string, unknown>;
  badgeCount: number;
};

/**
 * Expo push token varsa yalnızca Expo üzerinden gönderir (FCM/APNs zaten Expo tarafından
 * kullanılır). Expo token yoksa native FCM/APNs yedek yoluna düşer — çift bildirim önlenir.
 */
export async function sendPushToDevices(
  tokens: PushTokenRow[],
  payload: PushPayload,
): Promise<unknown[]> {
  const results: unknown[] = [];
  const { title, body, channelId, useCustom, slug, fullFilename, pushData, badgeCount } = payload;
  const presentation = buildBrandedPushPresentation(title, body, pushData);
  const androidBody = formatAndroidPushBody(presentation);
  const uniqueTokens = dedupePushTokens(tokens);
  const eventType = String(pushData.eventType ?? pushData.event_type ?? '');
  const incomingCall = isIncomingCallPushEvent(eventType);
  const messagePush = MESSAGE_PUSH_EVENT_TYPES.has(eventType);
  const categoryId = incomingCall
    ? INCOMING_CALL_PUSH_CATEGORY
    : messagePush
      ? MESSAGE_PUSH_CATEGORY
      : undefined;

  const expoEntries = uniqueTokens.filter((t) => !!t.expo_push_token);

  if (expoEntries.length > 0) {
    const hasImage = !!presentation.imageUrl;
    const iosCommunicationCall = incomingCall;

    const messages = expoEntries.map((entry) => {
      const ios = entry.platform === 'ios';
      const iosSound = resolveExpoPushSound(entry.platform, useCustom, slug);
      const androidSound = resolveExpoPushSound(entry.platform, useCustom, slug);
      const needsMutableContent = hasImage || (ios && iosCommunicationCall);
      const base = {
        to: entry.expo_push_token!,
        title: presentation.title,
        body: ios ? presentation.body : androidBody,
        badge: badgeCount,
        data: pushData,
        priority: 'high' as const,
        ...(categoryId ? { categoryId } : {}),
        ...(needsMutableContent ? { mutableContent: true } : {}),
        ...(hasImage ? { richContent: { image: presentation.imageUrl } } : {}),
      };

      if (ios) {
        return {
          ...base,
          ...(iosSound ? { sound: iosSound } : {}),
          ...(presentation.subtitle ? { subtitle: presentation.subtitle } : {}),
          interruptionLevel: (iosCommunicationCall ? 'time-sensitive' : 'active') as const,
        };
      }

      return {
        ...base,
        ...(androidSound ? { sound: androidSound } : {}),
        channelId,
      };
    });

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const expoJson = await expoRes.json().catch(() => ({}));
    if (!expoRes.ok) {
      results.push({
        data: [],
        errors: [
          typeof expoJson === 'object' && expoJson !== null && 'errors' in expoJson
            ? JSON.stringify((expoJson as { errors: unknown }).errors)
            : `expo_http_${expoRes.status}`,
        ],
      });
    } else {
      results.push(expoJson);
    }
  }

  for (const token of uniqueTokens) {
    if (token.expo_push_token) continue;
    if (!token.device_push_token) continue;

    if (token.platform === 'android') {
      const fcmResult = await sendFcm(
        token.device_push_token,
        presentation,
        androidBody,
        channelId,
        incomingCall ? undefined : useCustom ? slug : undefined,
        pushData,
        categoryId,
      );
      if (fcmResult) results.push(fcmResult);
    }

    if (token.platform === 'ios') {
      const apnsSound = resolveApnsPushSound(useCustom, fullFilename);
      const apnsResult = await sendApns(
        token.device_push_token,
        presentation,
        apnsSound,
        badgeCount,
        pushData,
        categoryId,
        incomingCall,
      );
      if (apnsResult) results.push(apnsResult);
    }
  }

  return results;
}

type ExpoPushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

/** Expo "DeviceNotRegistered" dönen tokenları devre dışı bırakmak için eşleştirir. */
export function collectInvalidExpoPushTokens(
  expoEntries: PushTokenRow[],
  expoResponse: unknown,
): string[] {
  const payload = expoResponse as { data?: ExpoPushTicket[] } | ExpoPushTicket[] | null;
  const tickets = Array.isArray(payload) ? payload : payload?.data;
  if (!tickets?.length) return [];

  const invalid: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status !== 'error') return;
    const code = ticket.details?.error ?? ticket.message ?? '';
    if (
      code.includes('DeviceNotRegistered') ||
      code.includes('InvalidCredentials') ||
      code.includes('MismatchSenderId')
    ) {
      const token = expoEntries[index]?.expo_push_token;
      if (token) invalid.push(token);
    }
  });
  return invalid;
}

export type ExpoPushDeliveryResult = {
  delivered: boolean;
  okCount: number;
  errorCount: number;
  errors: string[];
};

/** Expo push yanıtında en az bir başarılı ticket var mı? */
export function evaluateExpoPushDelivery(
  expoEntries: PushTokenRow[],
  expoResponse: unknown,
): ExpoPushDeliveryResult {
  if (expoEntries.length === 0) {
    return { delivered: true, okCount: 0, errorCount: 0, errors: [] };
  }

  const payload = expoResponse as
    | { data?: ExpoPushTicket[]; errors?: unknown[] }
    | ExpoPushTicket[]
    | null;

  if (!payload) {
    return {
      delivered: false,
      okCount: 0,
      errorCount: expoEntries.length,
      errors: ['empty_expo_response'],
    };
  }

  const topLevelErrors = Array.isArray((payload as { errors?: unknown[] }).errors)
    ? ((payload as { errors: unknown[] }).errors.map(String))
    : [];

  const tickets = Array.isArray(payload) ? payload : payload?.data;
  if (!tickets?.length) {
    return {
      delivered: false,
      okCount: 0,
      errorCount: expoEntries.length,
      errors: topLevelErrors.length ? topLevelErrors : ['no_expo_tickets'],
    };
  }

  let okCount = 0;
  let errorCount = 0;
  const errors: string[] = [...topLevelErrors];

  tickets.forEach((ticket) => {
    if (ticket.status === 'ok') {
      okCount += 1;
      return;
    }
    errorCount += 1;
    errors.push(ticket.details?.error ?? ticket.message ?? 'unknown_expo_error');
  });

  return {
    delivered: okCount > 0,
    okCount,
    errorCount,
    errors,
  };
}

async function sendFcm(
  token: string,
  presentation: BrandedPushPresentation,
  androidBody: string,
  channelId: string,
  soundSlugName: string | undefined,
  data: Record<string, unknown>,
  categoryId?: string,
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
        title: presentation.title,
        body: androidBody,
        ...(soundSlugName ? { sound: soundSlugName } : {}),
        android_channel_id: channelId,
        ...(presentation.imageUrl ? { image: presentation.imageUrl } : {}),
      },
      data: Object.fromEntries(
        Object.entries({ ...data, ...(categoryId ? { categoryId } : {}) }).map(([k, v]) => [
          k,
          v == null ? '' : String(v),
        ]),
      ),
    }),
  });

  return res.json();
}

async function sendApns(
  token: string,
  presentation: BrandedPushPresentation,
  sound: string | null,
  badge: number,
  data: Record<string, unknown>,
  categoryId?: string,
  communicationCall = false,
): Promise<unknown | null> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyContent = Deno.env.get('APNS_AUTH_KEY');
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.karadeniz.dijitalagi';

  if (!keyId || !teamId || !keyContent) return null;

  const jwt = await createApnsJwt(keyId, teamId, keyContent);
  const host =
    Deno.env.get('APNS_PRODUCTION') === 'false'
      ? 'api.sandbox.push.apple.com'
      : 'api.push.apple.com';

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
        alert: {
          title: presentation.title,
          ...(presentation.subtitle ? { subtitle: presentation.subtitle } : {}),
          body: presentation.body,
        },
        ...(sound ? { sound } : {}),
        badge,
        ...(categoryId ? { category: categoryId } : {}),
        ...(presentation.imageUrl || communicationCall ? { 'mutable-content': 1 } : {}),
        ...(communicationCall ? { 'interruption-level': 'time-sensitive' } : {}),
      },
      ...(presentation.imageUrl ? { image_url: presentation.imageUrl } : {}),
      body: data,
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
