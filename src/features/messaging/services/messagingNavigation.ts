import { type Href } from 'expo-router';
import { pushRoute, replaceRoute } from '@/lib/navigation/pushRoute';
import { prefetchChatRoute } from '@/lib/navigation/lazyRouteScreens';
import { supabase } from '@/lib/supabase/client';
import { markConversationRead } from './messageData';
import {
  prefetchConversationForOpen,
  primeConversationMessagesFromDisk,
} from './conversationOpenPrefetch';
import { refreshMessagingUnreadFromServer } from './messagingUnreadRefresh';
import { useMessagingStore } from '../store/messagingStore';

export type OpenChatOptions = {
  replace?: boolean;
  unreadCount?: number;
  userId?: string;
  from?: 'izdivac';
  messageId?: string;
};

/**
 * Sohbete tıklanınca tek giriş noktası:
 * rozet + bildirim anında kalkar, sunucuda okundu işaretlenir.
 */
export function prefetchChatNavigation(): void {
  prefetchChatRoute();
}

function buildChatHref(conversationId: string, options?: OpenChatOptions): Href {
  const base =
    options?.from === 'izdivac'
      ? `/chat/${conversationId}?from=izdivac`
      : `/chat/${conversationId}`;
  if (!options?.messageId) return base as Href;
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}messageId=${encodeURIComponent(options.messageId)}` as Href;
}

function navigateToChat(conversationId: string, options?: OpenChatOptions) {
  const href = buildChatHref(conversationId, options);
  if (options?.replace) {
    replaceRoute(href);
    return;
  }
  pushRoute(href);
}

export function openChat(conversationId: string, options?: OpenChatOptions) {
  const store = useMessagingStore.getState();
  const unread =
    options?.unreadCount ??
    store.getDisplayUnread(conversationId, store.conversationUnreadById[conversationId] ?? 0);

  store.enterConversation(conversationId, unread > 0 ? unread : undefined);

  const userIdHint = options?.userId;

  // Disk/ağ ısıtması navigasyonu bekletmez — pressIn zaten başlatır;
  // videolu sohbetlerde AsyncStorage + thumbnail yarışı açılışı donduruyordu.
  if (userIdHint) {
    void primeConversationMessagesFromDisk(conversationId, userIdHint);
    void prefetchConversationForOpen(conversationId, userIdHint);
  }

  void (async () => {
    const userId = userIdHint ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    if (!userIdHint) {
      void primeConversationMessagesFromDisk(conversationId, userId);
      void prefetchConversationForOpen(conversationId, userId);
    }
    void markConversationRead(conversationId, userId);
    void refreshMessagingUnreadFromServer(userId);
  })();

  navigateToChat(conversationId, options);
}
