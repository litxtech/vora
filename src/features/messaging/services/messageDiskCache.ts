import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/features/messaging/types';
import { capMessageList } from '@/features/messaging/utils/messageWindow';
import { CHAT_MESSAGE_PAGE_SIZE } from '@/features/messaging/constants';
import { useMessagingStore } from '@/features/messaging/store/messagingStore';

const INDEX_KEY = (userId: string) => `messaging:disk-index:v1:${userId}`;
const MSG_KEY = (userId: string, conversationId: string) =>
  `messaging:msgs:v1:${userId}:${conversationId}`;

const MAX_CONVERSATIONS = 20;
const PERSIST_DEBOUNCE_MS = 400;

type DiskMessageSnapshot = {
  messages: ChatMessage[];
  savedAt: number;
};

const memoryByKey = new Map<string, ChatMessage[]>();
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cacheKey(userId: string, conversationId: string): string {
  return `${userId}:${conversationId}`;
}

export function readMemoryPersistedMessages(
  userId: string,
  conversationId: string,
): ChatMessage[] | null {
  const cached = memoryByKey.get(cacheKey(userId, conversationId));
  return cached?.length ? cached : null;
}

export async function readPersistedMessages(
  userId: string,
  conversationId: string,
): Promise<ChatMessage[] | null> {
  const fromMemory = readMemoryPersistedMessages(userId, conversationId);
  if (fromMemory) return fromMemory;

  try {
    const raw = await AsyncStorage.getItem(MSG_KEY(userId, conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiskMessageSnapshot;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null;
    const messages = capMessageList(parsed.messages);
    memoryByKey.set(cacheKey(userId, conversationId), messages);
    return messages;
  } catch {
    return null;
  }
}

async function touchDiskIndex(userId: string, conversationId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY(userId));
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [conversationId, ...existing.filter((id) => id !== conversationId)].slice(
      0,
      MAX_CONVERSATIONS,
    );
    await AsyncStorage.setItem(INDEX_KEY(userId), JSON.stringify(next));
  } catch {
    // index best-effort
  }
}

async function writePersistedMessagesNow(
  userId: string,
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const capped = capMessageList(messages).slice(-CHAT_MESSAGE_PAGE_SIZE);
  if (capped.length === 0) return;

  memoryByKey.set(cacheKey(userId, conversationId), capped);
  useMessagingStore.getState().setCachedMessages(conversationId, capped);

  try {
    const snapshot: DiskMessageSnapshot = {
      messages: capped,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(MSG_KEY(userId, conversationId), JSON.stringify(snapshot));
    await touchDiskIndex(userId, conversationId);
  } catch {
    // disk best-effort
  }
}

export function schedulePersistMessages(
  userId: string,
  conversationId: string,
  messages: ChatMessage[],
): void {
  const key = cacheKey(userId, conversationId);
  const existing = persistTimers.get(key);
  if (existing) clearTimeout(existing);

  persistTimers.set(
    key,
    setTimeout(() => {
      persistTimers.delete(key);
      void writePersistedMessagesNow(userId, conversationId, messages);
    }, PERSIST_DEBOUNCE_MS),
  );
}

export async function flushPersistedMessages(
  userId: string,
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const key = cacheKey(userId, conversationId);
  const pending = persistTimers.get(key);
  if (pending) {
    clearTimeout(pending);
    persistTimers.delete(key);
  }
  await writePersistedMessagesNow(userId, conversationId, messages);
}

/** Sohbet listesi yüklendiğinde son konuşmaların mesajlarını belleğe al. */
export async function hydrateMessageDiskCache(
  userId: string,
  conversationIds: string[],
): Promise<void> {
  const targets = conversationIds.slice(0, 10);
  await Promise.all(
    targets.map(async (conversationId) => {
      if (useMessagingStore.getState().getCachedMessages(conversationId).length > 0) {
        return;
      }
      const messages = await readPersistedMessages(userId, conversationId);
      if (messages?.length) {
        useMessagingStore.getState().setCachedMessages(conversationId, messages);
      }
    }),
  );
}

export async function clearMessageDiskCacheForUser(userId: string): Promise<void> {
  for (const key of [...persistTimers.keys()]) {
    if (key.startsWith(`${userId}:`)) {
      const timer = persistTimers.get(key);
      if (timer) clearTimeout(timer);
      persistTimers.delete(key);
    }
  }

  for (const key of [...memoryByKey.keys()]) {
    if (key.startsWith(`${userId}:`)) memoryByKey.delete(key);
  }

  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY(userId));
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    await Promise.all(ids.map((id) => AsyncStorage.removeItem(MSG_KEY(userId, id))));
    await AsyncStorage.removeItem(INDEX_KEY(userId));
  } catch {
    // ignore
  }
}
