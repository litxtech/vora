import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

function conversationIdFromData(data: Record<string, unknown>): string | null {
  const id = data.conversation_id ?? data.conversationId;
  return typeof id === 'string' ? id : null;
}

/** Sohbet açılınca ilgili sistem bildirimlerini kaldır. */
export async function dismissConversationNotifications(conversationId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((entry) => {
          const data = entry.request.content.data as Record<string, unknown>;
          return conversationIdFromData(data) === conversationId;
        })
        .map((entry) => Notifications.dismissNotificationAsync(entry.request.identifier)),
    );
  } catch {
    // Bildirim merkezi okunamazsa sessizce geç
  }
}
