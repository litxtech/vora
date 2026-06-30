import type { NotificationEventType } from '@/constants/notifications';

const ID_MIRROR: [string, string][] = [
  ['postId', 'post_id'],
  ['reelId', 'reel_id'],
  ['conversationId', 'conversation_id'],
  ['messageId', 'message_id'],
  ['commentId', 'comment_id'],
  ['eventId', 'event_id'],
  ['jobId', 'job_id'],
  ['incidentId', 'incident_id'],
  ['lostItemId', 'lost_item_id'],
  ['voraNeedId', 'vora_need_id'],
  ['hotelId', 'hotel_id'],
  ['needId', 'need_id'],
  ['channelId', 'channel_id'],
  ['callSessionId', 'call_session_id'],
  ['staffRequestId', 'staff_request_id'],
  ['applicationId', 'application_id'],
  ['requestId', 'request_id'],
  ['ticketId', 'ticket_id'],
  ['tripId', 'trip_id'],
  ['reservationId', 'reservation_id'],
  ['listingId', 'listing_id'],
  ['orderId', 'order_id'],
  ['actorId', 'actor_id'],
  ['notificationId', 'notification_id'],
  ['outboxId', 'outbox_id'],
  ['recipientId', 'recipient_id'],
  ['userId', 'user_id'],
  ['contentImageUrl', 'content_image_url'],
  ['actorAvatarUrl', 'actor_avatar_url'],
];

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

/** Push / inbox verisini tek biçime getirir (snake + camel). */
export function normalizeNotificationData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data };

  for (const [camel, snake] of ID_MIRROR) {
    const camelVal = normalized[camel];
    const snakeVal = normalized[snake];
    if (camelVal != null && snakeVal == null) normalized[snake] = camelVal;
    if (snakeVal != null && camelVal == null) normalized[camel] = snakeVal;
  }

  return normalized;
}

export function buildNotificationData(
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  return normalizeNotificationData(data);
}

export function extractNotificationEventType(
  data: Record<string, unknown>,
): NotificationEventType | null {
  const raw = data.eventType ?? data.event_type;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? (trimmed as NotificationEventType) : null;
}

/** FCM / APNs düz string olarak gönderdiğinde bayrak okuma */
export function isTruthyDataFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export function extractActorId(data: Record<string, unknown>): string | null {
  return pickString(data, 'actorId', 'actor_id');
}

export function extractNotificationId(data: Record<string, unknown>): string | undefined {
  return pickString(data, 'notificationId', 'notification_id') ?? undefined;
}

export function extractRecipientId(data: Record<string, unknown>): string | null {
  return pickString(data, 'recipientId', 'recipient_id', 'userId', 'user_id');
}

export type NotificationTargetIds = {
  postId: string | null;
  reelId: string | null;
  conversationId: string | null;
  messageId: string | null;
  commentId: string | null;
  eventId: string | null;
  jobId: string | null;
  incidentId: string | null;
  lostItemId: string | null;
  voraNeedId: string | null;
  hotelId: string | null;
  channelId: string | null;
  callSessionId: string | null;
  staffRequestId: string | null;
  applicationId: string | null;
  requestId: string | null;
  ticketId: string | null;
  tripId: string | null;
  reservationId: string | null;
  listingId: string | null;
  orderId: string | null;
  actorId: string | null;
};

export function extractTargetIds(data: Record<string, unknown>): NotificationTargetIds {
  const n = normalizeNotificationData(data);
  return {
    postId: pickString(n, 'postId', 'post_id'),
    reelId: pickString(n, 'reelId', 'reel_id'),
    conversationId: pickString(n, 'conversationId', 'conversation_id'),
    messageId: pickString(n, 'messageId', 'message_id'),
    commentId: pickString(n, 'commentId', 'comment_id'),
    eventId: pickString(n, 'eventId', 'event_id'),
    jobId: pickString(n, 'jobId', 'job_id'),
    incidentId: pickString(n, 'incidentId', 'incident_id'),
    lostItemId: pickString(n, 'lostItemId', 'lost_item_id'),
    voraNeedId: pickString(n, 'voraNeedId', 'vora_need_id', 'needId', 'need_id'),
    hotelId: pickString(n, 'hotelId', 'hotel_id'),
    channelId: pickString(n, 'channelId', 'channel_id'),
    callSessionId: pickString(n, 'callSessionId', 'call_session_id'),
    staffRequestId: pickString(n, 'staffRequestId', 'staff_request_id'),
    applicationId: pickString(n, 'applicationId', 'application_id'),
    requestId: pickString(n, 'requestId', 'request_id'),
    ticketId: pickString(n, 'ticketId', 'ticket_id'),
    tripId: pickString(n, 'tripId', 'trip_id'),
    reservationId: pickString(n, 'reservationId', 'reservation_id'),
    listingId: pickString(n, 'listingId', 'listing_id'),
    orderId: pickString(n, 'orderId', 'order_id'),
    actorId: pickString(n, 'actorId', 'actor_id'),
  };
}

export function isLikelyUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
