import type { NotificationEventType } from '@/constants/notifications';
import { fetchLinkedSiblingProfile } from '@/features/account-switch/services/linkedAccounts';
import {
  loadOwnedBusinessMeta,
  refreshLinkedSibling,
  switchToLinkedSiblingAccount,
} from '@/features/account-switch/services/accountSwitch';
import {
  readActingMode,
  writeActingMode,
  writeLastActiveAccount,
} from '@/features/account-switch/services/accountSwitchStorage';
import type { ActingMode } from '@/features/account-switch/types';
import { invalidateAllSessionCaches } from '@/lib/cache/invalidateSessionCaches';
import { extractRecipientId, normalizeNotificationData } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';

const BUSINESS_ROUTE_PREFIXES = [
  '/business-center',
  '/marketplace-center/account',
  '/hotel-center/reservations',
  '/hotel-center/account',
];

const BUSINESS_ACTING_EVENTS = new Set<NotificationEventType>([
  'business_post',
  'business_campaign',
  'business_event',
  'marketplace_payout_due',
  'marketplace_payout_completed',
  'marketplace_order_paid',
  'marketplace_ship_request',
  'marketplace_platform_approved',
  'hotel_reservation_received',
  'hotel_payout_due',
  'hotel_payout_completed',
  'hotel_marketing_campaign',
  'channel_post',
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickDeepLink(data: Record<string, unknown>): string | null {
  const raw = data.deep_link ?? data.deepLink ?? data.url;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

function inferNotificationActingMode(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): ActingMode | null {
  const deepLink = pickDeepLink(data);
  if (deepLink && BUSINESS_ROUTE_PREFIXES.some((prefix) => deepLink.startsWith(prefix))) {
    return 'business';
  }
  if (BUSINESS_ACTING_EVENTS.has(eventType)) {
    return 'business';
  }
  return null;
}

async function fetchAccountType(userId: string): Promise<'personal' | 'business'> {
  const { data } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .maybeSingle();
  return data?.account_type === 'business' ? 'business' : 'personal';
}

async function waitForSessionUser(expectedUserId: string, timeoutMs = 8000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id === expectedUserId) return true;
    await sleep(80);
  }
  return false;
}

async function switchActingMode(userId: string, mode: ActingMode): Promise<void> {
  await Promise.all([writeActingMode(userId, mode), writeLastActiveAccount(userId, mode)]);
  invalidateAllSessionCaches(userId);
}

async function ensureActingModeForNotification(
  userId: string,
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const requiredMode = inferNotificationActingMode(eventType, data);
  if (!requiredMode) return;

  const accountType = await fetchAccountType(userId);
  const currentMode =
    (await readActingMode(userId)) ?? (accountType === 'business' ? 'business' : 'personal');
  if (currentMode === requiredMode) return;

  if (accountType === 'business' || accountType === 'personal') {
    if (requiredMode === 'business' && accountType === 'personal') {
      const { hasBusiness } = await loadOwnedBusinessMeta(userId);
      if (!hasBusiness) return;
    }
    await switchActingMode(userId, requiredMode);
  }
}

async function resolveRecipientUserId(
  data: Record<string, unknown>,
  eventType: NotificationEventType,
  currentUserId: string,
): Promise<string | null> {
  const direct = extractRecipientId(data);
  if (direct) return direct;

  const requiredMode = inferNotificationActingMode(eventType, data);
  if (!requiredMode) return null;

  const sibling = await fetchLinkedSiblingProfile();
  if (!sibling) return null;

  const currentAccountType = await fetchAccountType(currentUserId);
  if (requiredMode === 'business' && sibling.accountType === 'business' && currentAccountType === 'personal') {
    return sibling.siblingId;
  }
  if (requiredMode === 'personal' && sibling.accountType === 'personal' && currentAccountType === 'business') {
    return sibling.siblingId;
  }

  return null;
}

export type EnsureNotificationAccountResult = {
  ready: boolean;
  needsReauth?: boolean;
};

/** Push bildirimi hedef kullanıcısı için doğru oturum / görünüm moduna geçer. */
export async function ensureNotificationRecipientAccount(
  eventType: NotificationEventType,
  rawData: Record<string, unknown>,
): Promise<EnsureNotificationAccountResult> {
  const data = normalizeNotificationData(rawData);

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData.session?.user?.id;
  if (!currentUserId) return { ready: false };

  const recipientId = await resolveRecipientUserId(data, eventType, currentUserId);
  if (!recipientId || recipientId === currentUserId) {
    await ensureActingModeForNotification(currentUserId, eventType, data);
    return { ready: true };
  }

  const sibling = await refreshLinkedSibling();
  if (!sibling || sibling.siblingId !== recipientId) {
    return { ready: true };
  }

  const swapResult = await switchToLinkedSiblingAccount(
    currentUserId,
    recipientId,
    sibling.accountType,
  );
  if (swapResult.error) {
    return { ready: false, needsReauth: swapResult.needsReauth };
  }

  const sessionReady = await waitForSessionUser(recipientId);
  if (!sessionReady) return { ready: false };

  await sleep(120);
  return { ready: true };
}
