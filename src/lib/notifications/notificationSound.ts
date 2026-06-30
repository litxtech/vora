import { AppState } from 'react-native';
import type { NotificationEventType } from '@/constants/notifications';
import {
  playForegroundNotificationSound,
  shouldPlayNotificationSound,
} from '@/lib/notifications/soundPlayer';

type NotificationSoundPayload = {
  notificationId?: string | null;
  eventType?: NotificationEventType | string;
  useCustomSound?: boolean | string;
};

function readUseCustomSound(value: unknown): boolean {
  return value === true || value === 'true';
}

export async function handleIncomingNotificationSound(
  payload: NotificationSoundPayload,
): Promise<void> {
  const notificationKey = payload.notificationId ?? null;
  if (!shouldPlayNotificationSound(notificationKey)) return;

  const useCustom = readUseCustomSound(payload.useCustomSound);
  await playForegroundNotificationSound(payload.eventType, useCustom);
}
