import type { ConversationListItem } from '@/features/messaging/types';

const cache = new Map<string, ConversationListItem[]>();

function buildKey(userId: string, archivedOnly: boolean): string {
  return `${userId}:${archivedOnly ? 'archived' : 'inbox'}`;
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
}

export function invalidateConversationListCache(userId?: string): void {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}
