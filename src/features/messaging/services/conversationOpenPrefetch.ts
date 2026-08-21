import { CHAT_MESSAGE_PAGE_SIZE } from '../constants';
import type { ChatMessage, ConversationDetail } from '../types';
import {
  conversationDetailFromListItem,
  findCachedConversationListItem,
} from '../utils';
import { capMessageList } from '../utils/messageWindow';
import { readMemoryPersistedMessages, readPersistedMessages } from './messageDiskCache';
import { useMessagingStore } from '../store/messagingStore';
import { getCachedConversationList } from './conversationListCache';
import { fetchConversationDetail } from './conversationData';
import { fetchMessages } from './messageData';
import { getChatOpenPageSize } from '@/lib/device/androidPerfProfile';

const inflight = new Map<string, Promise<void>>();
const diskPrimeInflight = new Map<string, Promise<ChatMessage[]>>();

export type ConversationOpenSnapshot = {
  messages: ChatMessage[];
  conversation: ConversationDetail | null;
  hasMore: boolean;
  otherLastReadAt: string | null;
};

const EMPTY_SNAPSHOT: ConversationOpenSnapshot = {
  messages: [],
  conversation: null,
  hasMore: true,
  otherLastReadAt: null,
};

export function emptyConversationOpenSnapshot(): ConversationOpenSnapshot {
  return EMPTY_SNAPSHOT;
}

/** Bellek + liste cache — senkron; ilk boyada boş ekranı önler. */
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

/**
 * AsyncStorage → bellek cache. pressIn / load sırasında ağdan önce çağrılır;
 * ChatScreen mount olduğunda snapshot dolu olur.
 */
export function primeConversationMessagesFromDisk(
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const store = useMessagingStore.getState();
  const memory = store.getCachedMessages(conversationId);
  if (memory.length > 0) return Promise.resolve(memory);

  const fromRam = readMemoryPersistedMessages(userId, conversationId);
  if (fromRam?.length) {
    const capped = capMessageList(fromRam);
    store.setCachedMessages(conversationId, capped);
    return Promise.resolve(capped);
  }

  const existing = diskPrimeInflight.get(conversationId);
  if (existing) return existing;

  const task = (async () => {
    try {
      const disk = await readPersistedMessages(userId, conversationId);
      if (!disk?.length) return [];
      const capped = capMessageList(disk);
      if (store.getCachedMessages(conversationId).length === 0) {
        store.setCachedMessages(conversationId, capped);
      }
      return capped;
    } catch {
      return [];
    } finally {
      diskPrimeInflight.delete(conversationId);
    }
  })();

  diskPrimeInflight.set(conversationId, task);
  return task;
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

  const pageSize = getChatOpenPageSize();

  const task = (async () => {
    try {
      // Disk önce — ağ beklenmeden UI mesaj gösterebilir.
      if (cachedMessages.length === 0) {
        await primeConversationMessagesFromDisk(conversationId, userId);
      }

      const afterDisk = store.getCachedMessages(conversationId);
      const needDetail = !store.getCachedConversationDetail(conversationId);
      const needMessages = afterDisk.length === 0;

      if (!needDetail && !needMessages) return;

      let detail = store.getCachedConversationDetail(conversationId);

      if (needDetail && needMessages) {
        const [fetchedDetail, messages] = await Promise.all([
          fetchConversationDetail(conversationId, userId),
          fetchMessages(conversationId, userId, null, pageSize),
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

      if (needMessages) {
        const resolvedDetail = detail ?? store.getCachedConversationDetail(conversationId);
        const messages = await fetchMessages(
          conversationId,
          userId,
          resolvedDetail?.otherLastReadAt ?? null,
          pageSize,
        );
        if (messages.length > 0) {
          store.setCachedMessages(conversationId, capMessageList(messages));
        }
      } else if (afterDisk.length > 0) {
        // Disk var — taze mesajları arka planda çek (UI bloklamadan).
        void (async () => {
          try {
            const resolvedDetail =
              store.getCachedConversationDetail(conversationId) ??
              (await fetchConversationDetail(conversationId, userId));
            if (!resolvedDetail) return;
            store.setCachedConversationDetail(conversationId, resolvedDetail);
            const messages = await fetchMessages(
              conversationId,
              userId,
              resolvedDetail.otherLastReadAt,
              pageSize,
            );
            if (messages.length > 0) {
              store.setCachedMessages(conversationId, capMessageList(messages));
            }
          } catch {
            // ChatScreen sync yedek
          }
        })();
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
