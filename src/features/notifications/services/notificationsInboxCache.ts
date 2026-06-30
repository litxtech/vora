import type { NotificationCategoryId } from '@/constants/notifications';
import type { AppNotification } from '@/lib/notifications/types';

const cache = new Map<string, AppNotification[]>();

function buildKey(userId: string, category: NotificationCategoryId): string {
  return `${userId}|${category}`;
}

export function getCachedNotifications(
  userId: string,
  category: NotificationCategoryId,
): AppNotification[] | null {
  return cache.get(buildKey(userId, category)) ?? null;
}

export function setCachedNotifications(
  userId: string,
  category: NotificationCategoryId,
  items: AppNotification[],
): void {
  cache.set(buildKey(userId, category), items);
}

export function invalidateNotificationsCache(userId?: string): void {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}|`)) cache.delete(key);
  }
}
