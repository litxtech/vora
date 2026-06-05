import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_EVENT_TYPES } from '@/constants/notifications';
import type { NotificationSoundSetting } from '@/lib/notifications/types';

export async function ensureAndroidChannels(settings: NotificationSoundSetting[]): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const event of NOTIFICATION_EVENT_TYPES) {
    const setting = settings.find((s) => s.eventType === event.id);
    const useCustom = setting?.isCustomEnabled && setting.soundUrl;
    const channelId = `vora_${event.id}`;

    await Notifications.setNotificationChannelAsync(channelId, {
      name: event.label,
      importance: Notifications.AndroidImportance.HIGH,
      sound: useCustom ? setting!.soundUrl! : 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }
}

export function channelIdForEvent(eventType: string): string {
  return `vora_${eventType}`;
}
