import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_EVENT_TYPES } from '@/constants/notifications';

const HIGH_PRIORITY_EVENTS = new Set([
  'message',
  'group_message',
  'call_incoming',
  'call_video',
  'call_missed',
  'emergency',
  'security_alert',
]);

const INCOMING_CALL_EVENTS = new Set(['call_incoming', 'call_video']);

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  for (const event of NOTIFICATION_EVENT_TYPES) {
    const channelId = `vora_${event.id}`;
    const highPriority = HIGH_PRIORITY_EVENTS.has(event.id);
    const incomingCall = INCOMING_CALL_EVENTS.has(event.id);

    await Notifications.setNotificationChannelAsync(channelId, {
      name: event.label,
      importance: incomingCall
        ? Notifications.AndroidImportance.MAX
        : highPriority
          ? Notifications.AndroidImportance.HIGH
          : Notifications.AndroidImportance.DEFAULT,
      // Omit `sound` — Android uses the system default. The string 'default' is treated as a custom asset name.
      vibrationPattern: incomingCall
        ? [0, 500, 250, 500, 250, 500]
        : highPriority
          ? [0, 250, 250, 250]
          : [0, 200],
      enableVibrate: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }
}

export function channelIdForEvent(eventType: string): string {
  return `vora_${eventType}`;
}
