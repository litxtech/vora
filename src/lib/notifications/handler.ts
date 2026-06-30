import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { syncAppIconBadge } from '@/lib/notifications/badge';

const MESSAGE_EVENT_TYPES = new Set(['message', 'group_message']);

/**
 * Yalnızca uygulama ÖN PLANDAYKEN banner/ses davranışını belirler.
 * Arka plan / kapalı durumda bildirim Apple APNs üzerinden gelir (sunucu push payload).
 */
if (typeof Notifications.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const content = notification.request.content;
      const data = content.data as Record<string, unknown>;
      const eventType = String(data?.eventType ?? data?.event_type ?? '');
      const isMessage = MESSAGE_EVENT_TYPES.has(eventType);
      const isForeground = AppState.currentState === 'active';

      if (!isMessage && typeof content.badge === 'number') {
        await syncAppIconBadge(content.badge);
      }

      // Ön planda mesaj bildirimi: realtime yerel bildirim gösterir; remote çift gelmesin.
      if (isMessage && isForeground) {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
        };
      }

      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}
