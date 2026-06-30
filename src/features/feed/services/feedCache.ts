import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEED_PAGE_SIZE } from '@/features/feed/constants';
import type { FeedCategory, FeedItem } from '@/features/feed/types';
import type { RegionId } from '@/constants/regions';

const DISK_KEY = 'feed:page_cache_v3';

export type FeedCacheSnapshot = {
  cacheKey: string;
  items: FeedItem[];
  cursor: string | null;
  hasMore: boolean;
  savedAt: number;
};

let memoryCache: FeedCacheSnapshot | null = null;

export function buildFeedCacheKey(input: {
  regionId: RegionId | null;
  district: string | null;
  category: FeedCategory;
  searchQuery: string;
  userId: string | null;
}): string {
  return `${input.regionId ?? 'all'}|${input.district ?? ''}|${input.category}|${input.searchQuery}|${input.userId ?? 'anon'}`;
}

export function readMemoryFeedCache(cacheKey: string): FeedCacheSnapshot | null {
  if (memoryCache?.cacheKey !== cacheKey) return null;
  return memoryCache;
}

export async function readDiskFeedCache(cacheKey: string): Promise<FeedCacheSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedCacheSnapshot;
    if (parsed.cacheKey !== cacheKey || !Array.isArray(parsed.items)) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFeedCache(snapshot: FeedCacheSnapshot): Promise<void> {
  const trimmed = {
    ...snapshot,
    items: snapshot.items.slice(0, FEED_PAGE_SIZE),
  };
  memoryCache = trimmed;
  try {
    await AsyncStorage.setItem(DISK_KEY, JSON.stringify(trimmed));
  } catch {
    // disk cache best-effort
  }
}

export async function hydrateFeedCacheFromDisk(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    if (!raw) return;
    memoryCache = JSON.parse(raw) as FeedCacheSnapshot;
  } catch {
    memoryCache = null;
  }
}
