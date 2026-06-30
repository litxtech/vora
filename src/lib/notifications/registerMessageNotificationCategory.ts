import * as Notifications from 'expo-notifications';
import {
  MESSAGE_NOTIFICATION_CATEGORY,
  MESSAGE_REPLY_ACTION,
} from '@/features/messaging/constants/notificationReply';

/** Mesaj bildirimlerinde "Yanıtla" metin kutusu (WhatsApp tarzı). */
export async function registerMessageNotificationCategory(): Promise<void> {
  if (typeof Notifications.setNotificationCategoryAsync !== 'function') return;

  await Notifications.setNotificationCategoryAsync(MESSAGE_NOTIFICATION_CATEGORY, [
    {
      identifier: MESSAGE_REPLY_ACTION,
      buttonTitle: 'Yanıtla',
      textInput: {
        submitButtonTitle: 'Gönder',
        placeholder: 'Mesaj yazın…',
      },
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}
