import type { NotificationEventType } from '@/constants/notifications';
import { IZDIVAC_CENTER_DEF } from '@/features/izdivac/constants';

const CENTERS_TAB_ROUTE = '/(tabs)/centers';

const IZdivac_EVENT_TYPES = new Set<string>([
  'izdivac_access_granted',
  'izdivac_access_revoked',
  'izdivac_post_comment',
  'izdivac_post_join',
  'izdivac_invite_received',
  'izdivac_invite_accepted',
]);

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function pickDeepLink(data: Record<string, unknown>): string | null {
  const raw = data.deep_link ?? data.deepLink ?? data.url;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

function resolveIzdivacKind(
  eventType: NotificationEventType | string | null | undefined,
  data: Record<string, unknown>,
): string | null {
  const kind = pickString(data, 'kind');
  const centerId = pickString(data, 'centerId', 'center_id');

  if (eventType && IZdivac_EVENT_TYPES.has(eventType)) {
    return eventType;
  }
  if (kind && IZdivac_EVENT_TYPES.has(kind)) {
    return kind;
  }
  if (centerId === IZDIVAC_CENTER_DEF.id) {
    return 'legacy_center';
  }

  return null;
}

export function isIzdivacNotificationEvent(
  eventType: NotificationEventType | string,
  data: Record<string, unknown> = {},
): boolean {
  return resolveIzdivacKind(eventType, data) != null;
}

export function resolveIzdivacNotificationHref(
  eventType: NotificationEventType | string | null | undefined,
  data: Record<string, unknown>,
): string | null {
  const kind = resolveIzdivacKind(eventType, data);
  if (!kind) return null;

  const deepLink = pickDeepLink(data);
  if (deepLink) return deepLink;

  if (kind === 'izdivac_access_revoked') return CENTERS_TAB_ROUTE;
  if (kind === 'izdivac_post_comment' || kind === 'izdivac_post_join') {
    return '/izdivac-center?tab=wall';
  }
  if (kind === 'izdivac_invite_received') {
    return '/izdivac-center?tab=messages';
  }
  if (kind === 'izdivac_invite_accepted') {
    const conversationId = pickString(data, 'conversation_id', 'conversationId');
    if (conversationId) return `/chat/${conversationId}`;
    return '/izdivac-center?tab=messages';
  }
  return IZDIVAC_CENTER_DEF.route;
}

export function getIzdivacNotificationActionLabel(
  eventType: NotificationEventType | string,
  data: Record<string, unknown>,
): string {
  const hint = pickString(data, 'action_hint', 'actionHint');
  if (hint) return hint;

  const kind = resolveIzdivacKind(eventType, data);
  if (kind === 'izdivac_access_revoked') return 'Merkezler sekmesine git';
  if (kind === 'izdivac_post_comment' || kind === 'izdivac_post_join') return 'Duvara git';
  if (kind === 'izdivac_invite_received') return 'Mesajlara git';
  if (kind === 'izdivac_invite_accepted') return 'Sohbete git';
  if (kind === 'izdivac_access_granted' || kind === 'legacy_center') return 'İzdivaç merkezine git';
  return 'Detayı aç';
}
