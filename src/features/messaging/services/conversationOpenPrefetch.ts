import { CHAT_MESSAGE_PAGE_SIZE } from '../constants';
import type { ChatMessage, ConversationDetail } from '../types';
import {
  conversationDetailFromListItem,
  findCachedConversationListItem,
} from '../utils';
import { capMessageList } from '../utils/messageWindow';
import { readMemoryPersistedMessages } from './messageDiskCache';
import { useMessagingStore } from '../store/messagingStore';
import { getCachedConversationList } from './conversationListCache';
import { fetchConversationDetail } from './conversationData';
import { fetchMessages } from './messageData';

const inflight = new Map<string, Promise<void>>();

export type ConversationOpenSnapshot = {
  messages: ChatMessage[];
  conversation: ConversationDetail | null;
  hasMore: boolean;
  otherLastReadAt: string | null;
};

export function readConversationOpenSnapshot(
  conversationId: string,
  userId: string | undefined,
): ConversationOpenSnapshot {
  const store = useMessagingStore.getState();
  let cached = store.getCachedMessages(conversationId);

  if (cached.length === 0 && userId) {
    const fromDisk = readMemoryPersistedMessages(userId, conversationId);
    if (fromDisk?.length) {
      cached = fromDisk;
      store.setCachedMessages(conversationId, capMessageList(fromDisk));
    }
  }

  const cachedDetail = store.getCachedConversationDetail(conversationId);
  let conversation = cachedDetail ?? null;

  if (!conversation && userId) {
    const listItem = findCachedConversationListItem(
      userId,
      conversationId,
      getCachedConversationList,
    );
    if (listItem) conversation = conversationDetailFromListItem(listItem);
  }

  return {
    messages: capMessageList(cached),
    conversation,
    hasMore: cached.length >= CHAT_MESSAGE_PAGE_SIZE,
    otherLastReadAt: conversation?.otherLastReadAt ?? null,
  };
}

export function prefetchConversationForOpen(conversationId: string, userId: string): Promise<void> {
  const existing = inflight.get(conversationId);
  if (existing) return existing;

  const store = useMessagingStore.getState();
  const cachedMessages = store.getCachedMessages(conversationId);
  const cachedDetail = store.getCachedConversationDetail(conversationId);

  if (cachedMessages.length > 0 && cachedDetail) {
    return Promise.resolve();
  }

  const task = (async () => {
    try {
      const needDetail = !cachedDetail;
      const needMessages = cachedMessages.length === 0;

      if (!needDetail && !needMessages) return;

      let detail = cachedDetail;

      if (needDetail && needMessages) {
        const [fetchedDetail, messages] = await Promise.all([
          fetchConversationDetail(conversationId, userId),
          fetchMessages(conversationId, userId, null, CHAT_MESSAGE_PAGE_SIZE),
        ]);
        detail = fetchedDetail;
        if (detail) {
          store.setCachedConversationDetail(conversationId, detail);
          if (messages.length > 0) {
            store.setCachedMessages(conversationId, capMessageList(messages));
          }
        }
        return;
      }

      if (needDetail) {
        detail = await fetchConversationDetail(conversationId, userId);
        if (!detail) return;
        store.setCachedConversationDetail(conversationId, detail);
      }

      if (needMessages && detail) {
        const messages = await fetchMessages(
          conversationId,
          userId,
          detail.otherLastReadAt,
          CHAT_MESSAGE_PAGE_SIZE,
        );
        if (messages.length > 0) {
          store.setCachedMessages(conversationId, capMessageList(messages));
        }
      }
    } catch {
      // ChatScreen load() yedek yol
    } finally {
      inflight.delete(conversationId);
    }
  })();

  inflight.set(conversationId, task);
  return task;
}

export function awaitConversationOpenPrefetch(conversationId: string): Promise<void> {
  return inflight.get(conversationId) ?? Promise.resolve();
}
