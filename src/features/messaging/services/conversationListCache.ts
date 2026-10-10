import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationListItem } from '@/features/messaging/types';

const DISK_KEY = 'messaging:conversation_list_v1';
const DISK_LIST_CAP = 40;

const cache = new Map<string, ConversationListItem[]>();

type StoredConversationLists = {
  userId: string;
  inbox: ConversationListItem[];
  archived: ConversationListItem[];
};

let diskRead: Promise<void> | null = null;

function buildKey(userId: string, archivedOnly: boolean): string {
  return `${userId}:${archivedOnly ? 'archived' : 'inbox'}`;
}

function rememberIfEmpty(userId: string, archivedOnly: boolean, items: ConversationListItem[]): void {
  if (!items.length) return;
  const key = buildKey(userId, archivedOnly);
  if (!cache.has(key)) cache.set(key, items);
}

function scheduleDiskWrite(userId: string): void {
  const payload: StoredConversationLists = {
    userId,
    inbox: (cache.get(buildKey(userId, false)) ?? []).slice(0, DISK_LIST_CAP),
    archived: (cache.get(buildKey(userId, true)) ?? []).slice(0, DISK_LIST_CAP),
  };
  void AsyncStorage.setItem(DISK_KEY, JSON.stringify(payload)).catch(() => {});
}

export function getCachedConversationList(
  userId: string,
  archivedOnly: boolean,
): ConversationListItem[] | null {
  const items = cache.get(buildKey(userId, archivedOnly));
  return items?.length ? items : null;
}

export function setCachedConversationList(
  userId: string,
  archivedOnly: boolean,
  items: ConversationListItem[],
): void {
  if (items.length === 0) return;
  cache.set(buildKey(userId, archivedOnly), items);
  scheduleDiskWrite(userId);
}

/** Açılışta diski belleğe alır — sohbet sekmesi ilk karede dolu gelsin. */
export function hydrateConversationListCache(): Promise<void> {
  if (diskRead) return diskRead;

  diskRead = (async () => {
    try {
      const raw = await AsyncStorage.getItem(DISK_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredConversationLists;
      if (!parsed?.userId) return;
      rememberIfEmpty(parsed.userId, false, Array.isArray(parsed.inbox) ? parsed.inbox : []);
      rememberIfEmpty(parsed.userId, true, Array.isArray(parsed.archived) ? parsed.archived : []);
    } catch {
      // disk cache best-effort
    }
  })();

  return diskRead;
}

export function invalidateConversationListCache(userId?: string): void {
  if (!userId) {
    cache.clear();
    diskRead = null;
    void AsyncStorage.removeItem(DISK_KEY).catch(() => {});
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
  scheduleDiskWrite(userId);
}
