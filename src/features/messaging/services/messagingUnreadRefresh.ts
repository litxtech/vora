import { syncCombinedAppBadge } from '@/lib/notifications/messageNotificationBridge';
import { fetchConversationList } from './conversationData';
import { useMessagingStore } from '../store/messagingStore';

/** Tab rozeti + uygulama ikonu — sunucudaki okunmamış sayıyla hizalar. */
export async function refreshMessagingUnreadFromServer(userId: string): Promise<void> {
  const list = await fetchConversationList(false);
  useMessagingStore.getState().setUnreadFromConversations(list);
  await syncCombinedAppBadge(userId);
}
