import * as Notifications from 'expo-notifications';
import {
  INCOMING_CALL_ACTION_ACCEPT,
  INCOMING_CALL_ACTION_DECLINE,
  INCOMING_CALL_NOTIFICATION_CATEGORY,
} from '@/features/calls/constants';

/** Kilit ekranı / banner üzerinde Cevapla–Reddet aksiyonları (CallKit kullanılmaz). */
export async function registerIncomingCallNotificationCategory(): Promise<void> {
  if (typeof Notifications.setNotificationCategoryAsync !== 'function') return;

  await Notifications.setNotificationCategoryAsync(INCOMING_CALL_NOTIFICATION_CATEGORY, [
    {
      identifier: INCOMING_CALL_ACTION_ACCEPT,
      buttonTitle: 'Cevapla',
      options: { opensAppToForeground: true },
    },
    {
      identifier: INCOMING_CALL_ACTION_DECLINE,
      buttonTitle: 'Reddet',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}
