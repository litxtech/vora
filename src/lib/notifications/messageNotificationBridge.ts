import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getUnreadCount } from '@/features/notifications/services/notificationData';
import { useMessagingStore } from '@/features/messaging/store/messagingStore';
import { syncAppIconBadge } from '@/lib/notifications/badge';
import { channelIdForEvent, ensureAndroidChannels } from '@/lib/notifications/channels';
import { getLocalSoundPath } from '@/lib/notifications/soundCache';
import { MESSAGE_NOTIFICATION_CATEGORY } from '@/features/messaging/constants/notificationReply';
import {
  buildBrandedPushPresentation,
  formatAndroidPushBody,
} from '@/lib/notifications/pushBranding';
import {
  hasNotificationPermission,
  requestNotificationPermissions,
} from '@/lib/notifications/register';
import { supabase } from '@/lib/supabase/client';
import type { NotificationEventType } from '@/constants/notifications';

const recentNotificationKeys = new Map<string, number>();
const remoteMessageIds = new Map<string, number>();
const DEDUPE_MS = 15_000;
const REMOTE_DEDUPE_MS = 30_000;

/** Sunucu push ulaştığında yerel yedek bildirimi atla. */
export function markRemoteMessagePushReceived(messageId: string): void {
  if (!messageId) return;
  remoteMessageIds.set(messageId, Date.now());
}

function wasRemoteMessagePushRecent(messageId: string | undefined): boolean {
  if (!messageId) return false;
  const seenAt = remoteMessageIds.get(messageId);
  if (seenAt == null) return false;
  if (Date.now() - seenAt > REMOTE_DEDUPE_MS) {
    remoteMessageIds.delete(messageId);
    return false;
  }
  return true;
}

async function resolveMessagingUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_messaging_unread_count', {
    p_user_id: userId,
  });

  if (!error && data != null) {
    return Number(data);
  }

  return useMessagingStore.getState().totalUnread;
}

/** Uygulama rozeti: bildirim merkezi + okunmamış mesajlar. */
export async function syncCombinedAppBadge(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const [messageUnread, notifUnread] = await Promise.all([
    resolveMessagingUnreadCount(userId),
    getUnreadCount(userId),
  ]);
  await syncAppIconBadge(notifUnread + messageUnread);
}

export async function resolveCombinedBadgeCount(userId: string): Promise<number> {
  const [messageUnread, notifUnread] = await Promise.all([
    resolveMessagingUnreadCount(userId),
    getUnreadCount(userId),
  ]);
  return notifUnread + messageUnread;
}

type PresentMessageNotificationOptions = {
  conversationId: string;
  messageId?: string;
  title: string;
  body: string;
  isGroup?: boolean;
  avatarUrl?: string | null;
  senderName?: string | null;
  badge?: number;
  userId?: string;
};

async function ensureMessageNotificationReady(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await ensureAndroidChannels();
  }

  const existing = await Notifications.getPermissionsAsync();
  if (!hasNotificationPermission(existing)) {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;
  }

  return true;
}

/**
 * Sunucu push gecikirse veya ulaşmazsa realtime mesaj için yerel bildirim (WhatsApp tarzı).
 * iOS arka planda da yedek olarak çalışır; kapalıyken yalnızca APNs push devreye girer.
 */
export async function presentMessageNotification(
  options: PresentMessageNotificationOptions,
): Promise<void> {
  if (Platform.OS === 'web') return;

  if (options.messageId && wasRemoteMessagePushRecent(options.messageId)) {
    return;
  }

  const key =
    options.messageId ??
    `${options.conversationId}:${options.body.slice(0, 40)}:${options.title}`;
  const now = Date.now();
  const last = recentNotificationKeys.get(key);
  if (last != null && now - last < DEDUPE_MS) return;
  recentNotificationKeys.set(key, now);

  const ready = await ensureMessageNotificationReady();
  if (!ready) return;

  const eventType = options.isGroup ? 'group_message' : 'message';
  const channelId = channelIdForEvent(eventType);
  const pushData: Record<string, unknown> = {
    eventType,
    sender_name: options.senderName ?? options.title,
    actor_avatar_url: options.avatarUrl ?? undefined,
  };
  const presentation = buildBrandedPushPresentation(options.title, options.body, pushData);
  const androidBody = formatAndroidPushBody(presentation);
  const resolvedBadge =
    options.badge ??
    (options.userId ? await resolveCombinedBadgeCount(options.userId) : useMessagingStore.getState().totalUnread);
  const hasCustomSound = !!getLocalSoundPath(eventType as NotificationEventType);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: presentation.title,
        subtitle: presentation.subtitle,
        body: Platform.OS === 'android' ? androidBody : presentation.body,
        sound: hasCustomSound
          ? undefined
          : Platform.OS === 'ios'
            ? true
            : null,
        badge: Math.max(0, Math.floor(resolvedBadge)),
        data: {
          eventType,
          conversation_id: options.conversationId,
          conversationId: options.conversationId,
          message_id: options.messageId,
          channelId,
          actor_avatar_url: options.avatarUrl ?? undefined,
          sender_name: pushData.sender_name,
        },
        ...(Platform.OS === 'android' ? { channelId } : {}),
        categoryIdentifier: MESSAGE_NOTIFICATION_CATEGORY,
        ...(Platform.OS === 'ios'
          ? {
              threadIdentifier: options.conversationId,
              ...(presentation.imageUrl
                ? { attachments: [{ url: presentation.imageUrl }] }
                : {}),
            }
          : {}),
      },
      trigger: null,
    });
  } catch {
    // Bildirim gösterilemedi — sessizce geç
  }
}

/**
 * Arka planda sunucu push gecikirse yerel bildirim yedekler.
 * Ön planda yerel bildirim gösterilmez — push + yerel çift bildirim olmasın (WhatsApp gibi).
 */
export function scheduleMessageNotificationFallback(
  options: PresentMessageNotificationOptions,
  delayMs = 5500,
): () => void {
  if (AppState.currentState === 'active') {
    return () => undefined;
  }

  const timer = setTimeout(() => {
    if (options.messageId && wasRemoteMessagePushRecent(options.messageId)) return;
    void presentMessageNotification(options);
  }, delayMs);

  return () => clearTimeout(timer);
}
