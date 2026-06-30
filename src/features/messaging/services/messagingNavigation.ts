import { router, type Href } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { markConversationRead } from './messageData';
import { prefetchConversationForOpen } from './conversationOpenPrefetch';
import { refreshMessagingUnreadFromServer } from './messagingUnreadRefresh';
import { useMessagingStore } from '../store/messagingStore';

export type OpenChatOptions = {
  replace?: boolean;
  unreadCount?: number;
  userId?: string;
  from?: 'izdivac';
};

/**
 * Sohbete tıklanınca tek giriş noktası:
 * rozet + bildirim anında kalkar, sunucuda okundu işaretlenir.
 */
export function openChat(conversationId: string, options?: OpenChatOptions) {
  const store = useMessagingStore.getState();
  const unread =
    options?.unreadCount ??
    store.getDisplayUnread(conversationId, store.conversationUnreadById[conversationId] ?? 0);

  store.enterConversation(conversationId, unread > 0 ? unread : undefined);

  const userIdHint = options?.userId;
  if (userIdHint) {
    void prefetchConversationForOpen(conversationId, userIdHint);
  }

  void (async () => {
    const userId = userIdHint ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    if (!userIdHint) void prefetchConversationForOpen(conversationId, userId);
    void markConversationRead(conversationId, userId);
    void refreshMessagingUnreadFromServer(userId);
  })();

  const href = (
    options?.from === 'izdivac'
      ? `/chat/${conversationId}?from=izdivac`
      : `/chat/${conversationId}`
  ) as Href;
  if (options?.replace) {
    router.replace(href);
    return;
  }
  router.push(href);
}
