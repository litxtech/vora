import { readCachedFeedItemBySource } from '@/features/feed/services/feedCache';
import type { FeedItem, FeedSourceType } from '@/features/feed/types';

const MAX_ITEMS = 120;

const items = new Map<string, FeedItem>();
const order: string[] = [];

function keyFor(sourceType: FeedSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

/** Akışta görülen gönderi — detay ilk karede ağ beklemeden çizilsin. */
export function rememberFeedItem(item: FeedItem): void {
  if (item.isDemo || !item.sourceId) return;

  const key = keyFor(item.sourceType, item.sourceId);
  if (!items.has(key)) {
    order.push(key);
    if (order.length > MAX_ITEMS) {
      const oldest = order.shift();
      if (oldest) items.delete(oldest);
    }
  }
  items.set(key, item);
}

export function rememberFeedItems(next: FeedItem[]): void {
  for (const item of next) rememberFeedItem(item);
}

export function readRememberedFeedItem(
  sourceType: FeedSourceType,
  sourceId: string,
): FeedItem | null {
  const hit = items.get(keyFor(sourceType, sourceId));
  if (hit) return hit;

  const fromPage = readCachedFeedItemBySource(sourceType, sourceId);
  if (!fromPage) return null;
  rememberFeedItem(fromPage);
  return fromPage;
}
