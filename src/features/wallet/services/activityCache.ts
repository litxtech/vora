import type { WalletActivityItem } from '@/features/wallet/types';

const cache = new Map<string, WalletActivityItem>();

export function cacheWalletActivities(items: WalletActivityItem[]): void {
  cache.clear();
  for (const item of items) {
    cache.set(item.id, item);
  }
}

export function getCachedWalletActivity(id: string): WalletActivityItem | undefined {
  return cache.get(id);
}
