import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { handleColdStartNotificationResponse, handleNotificationResponse } from '@/lib/notifications/responseHandler';
import { registerIncomingCallNotificationCategory } from '@/lib/notifications/registerCallNotificationCategory';
import { registerMessageNotificationCategory } from '@/lib/notifications/registerMessageNotificationCategory';
import { useAuth } from '@/providers/AuthProvider';
import { EmergencyAlertOverlay } from '@/features/notifications/components/EmergencyAlertOverlay';
import { fetchSoundSettings, getUnreadCount } from '@/features/notifications/services/notificationData';
import type { NotificationEventType } from '@/constants/notifications';
import type { EmergencyAlertPayload } from '@/lib/notifications/types';
import { clearAppIconBadge } from '@/lib/notifications/badge';
import { syncCombinedAppBadge, markRemoteMessagePushReceived } from '@/lib/notifications/messageNotificationBridge';
import { handleIncomingNotificationSound } from '@/lib/notifications/notificationSound';
import {
  isIncomingCallEvent,
  presentIncomingCallFromNotification,
} from '@/features/calls/services/presentIncomingCall';
import { useMessagingUnreadSync } from '@/features/messaging/hooks/useMessagingUnreadSync';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { registerPushTokens, subscribePushTokenRefresh } from '@/lib/notifications/register';
import { supabase } from '@/lib/supabase/client';
import { NotificationContext, type NotificationContextValue } from '@/providers/notificationContext';

export { useNotifications } from '@/providers/notificationContext';
export type { NotificationContextValue } from '@/providers/notificationContext';

const EMERGENCY_EVENTS = new Set<NotificationEventType>([
  'emergency',
  'regional_alert',
  'security_alert',
]);

async function loadAndSyncSounds(): Promise<void> {
  const settings = await fetchSoundSettings();
  const { syncNotificationSounds } = await import('@/lib/notifications/soundSync');
  await syncNotificationSounds(settings);
}

function isCriticalEmergency(data: Record<string, unknown>, eventType?: NotificationEventType): boolean {
  if (!eventType || !EMERGENCY_EVENTS.has(eventType)) return false;
  const severity = data.severity as string | undefined;
  const emergencyType = data.emergency_type as string | undefined;
  return severity === 'critical' || !!emergencyType || eventType === 'emergency';
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyAlertPayload | null>(null);
  useMessagingUnreadSync();

  useEffect(() => {
    void registerIncomingCallNotificationCategory().catch(() => undefined);
    void registerMessageNotificationCategory().catch(() => undefined);

    if (Platform.OS === 'android') {
      void import('@/lib/notifications/channels').then(({ ensureAndroidChannels }) =>
        ensureAndroidChannels().catch(() => undefined),
      );
    }
  }, []);

  const refreshUnread = async () => {
    if (!user) {
      setUnreadCount(0);
      await clearAppIconBadge();
      return;
    }
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
    await syncCombinedAppBadge(user.id);
  };

  const resyncSounds = async () => {
    await loadAndSyncSounds();
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      clearAppIconBadge().catch(() => undefined);
      return;
    }

    const userId = user.id;
    let cancelled = false;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;
    let unsubscribePushTokenRefresh: (() => void) | null = null;
    let notifChannel: ReturnType<typeof supabase.channel> | null = null;
    let soundChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pushInitialized = false;

    const syncPush = () => registerPushTokens(userId).catch(() => undefined);

    const tearDownRealtime = () => {
      if (notifChannel) {
        supabase.removeChannel(notifChannel);
        notifChannel = null;
      }
      if (soundChannel) {
        supabase.removeChannel(soundChannel);
        soundChannel = null;
      }
    };

    const connectRealtime = () => {
      if (cancelled || AppState.currentState !== 'active' || notifChannel) return;

      notifChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            refreshUnread();
            const row = payload.new as Record<string, unknown>;
            const eventType = row.event_type as NotificationEventType;
            const priority = row.priority as string;
            const data = (row.data as Record<string, unknown>) ?? {};

            if (isIncomingCallEvent(eventType)) {
              presentIncomingCallFromNotification(
                { ...data, eventType, event_type: eventType },
                { currentUserId: userId },
              );
            }

            if (AppState.currentState === 'active') {
              void handleIncomingNotificationSound({
                notificationId: typeof row.id === 'string' ? row.id : null,
                eventType,
                useCustomSound: data.useCustomSound,
              });
            }

            if (priority === 'critical' || isCriticalEmergency(data, eventType)) {
              setEmergencyAlert({
                title: (row.title as string) ?? 'Acil Durum',
                body: (row.body as string) ?? '',
                eventType,
                data,
              });
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshUnread();
          },
        )
        .subscribe();

      soundChannel = supabase
        .channel('notification-sound-settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notification_sound_settings' },
          () => loadAndSyncSounds(),
        )
        .subscribe();
    };

    const scheduleActiveRefresh = () => {
      if (activeRefreshTimer) clearTimeout(activeRefreshTimer);
      activeRefreshTimer = setTimeout(() => {
        activeRefreshTimer = null;
        refreshUnread().catch(() => undefined);
      }, 500);
    };

    const received = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = content.data as Record<string, unknown>;
      const eventType = data?.eventType as NotificationEventType | undefined;
      const messageId =
        typeof data?.message_id === 'string'
          ? data.message_id
          : typeof data?.messageId === 'string'
            ? data.messageId
            : null;

      if (messageId && (eventType === 'message' || eventType === 'group_message')) {
        markRemoteMessagePushReceived(messageId);
      }

      if (isIncomingCallEvent(eventType)) {
        presentIncomingCallFromNotification(data, { currentUserId: userId });
      }

      void refreshUnread();
      const notificationId =
        typeof data?.notificationId === 'string' ? data.notificationId : null;
      const shouldPlayFromPush =
        AppState.currentState !== 'active' || !notificationId;

      if (shouldPlayFromPush) {
        void handleIncomingNotificationSound({
          notificationId,
          eventType,
          useCustomSound: data?.useCustomSound,
        });
      }

      if (isCriticalEmergency(data, eventType)) {
        setEmergencyAlert({
          title: content.title ?? 'Acil Durum',
          body: content.body ?? '',
          eventType: eventType ?? 'emergency',
          data,
        });
      }
    });

    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      refreshUnread();
      const data = event.notification.request.content.data as Record<string, unknown>;
      handleNotificationResponse(data, {
        actionIdentifier: event.actionIdentifier,
        userText: event.userText,
      });
    });

    void handleColdStartNotificationResponse();

    const initHeavy = () => {
      if (cancelled) return;

      if (!pushInitialized) {
        pushInitialized = true;
        syncPush();
        unsubscribePushTokenRefresh = subscribePushTokenRefresh(userId);
        loadAndSyncSounds().catch(() => undefined);
        void import('@/lib/notifications/soundPlayer').then(({ prepareNotificationAudioMode }) =>
          prepareNotificationAudioMode().catch(() => undefined),
        );
      }

      scheduleActiveRefresh();
      if (AppState.currentState === 'active') connectRealtime();
    };

    const bootDelayMs = getHeavyFeatureBootDelayMs('notifications');
    if (bootDelayMs > 0) {
      initTimer = setTimeout(initHeavy, bootDelayMs);
    } else {
      deferTask = deferBackgroundWork(initHeavy);
    }

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncPush();
        scheduleActiveRefresh();
        connectRealtime();
        return;
      }
      if (state === 'background' || state === 'inactive') {
        tearDownRealtime();
        void syncCombinedAppBadge(userId);
      }
    });

    return () => {
      cancelled = true;
      if (initTimer) clearTimeout(initTimer);
      deferTask?.cancel();
      if (activeRefreshTimer) clearTimeout(activeRefreshTimer);
      received.remove();
      response.remove();
      appStateSub.remove();
      unsubscribePushTokenRefresh?.();
      tearDownRealtime();
    };
  }, [user?.id]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread, resyncSounds }),
    [unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <EmergencyAlertOverlay alert={emergencyAlert} onDismiss={() => setEmergencyAlert(null)} />
    </NotificationContext.Provider>
  );
}
