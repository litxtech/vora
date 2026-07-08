import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { STORY_RING_INITIAL_PAGE_SIZE } from '@/features/stories/constants';
import { fetchStoryRings } from '@/features/stories/services/fetchStoryRings';
import { useStoryRingStore } from '@/features/stories/store/storyRingStore';
import type { StoryRing } from '@/features/stories/types';

const DISK_KEY = 'stories:rings_cache_v1';
const CACHE_TTL_MS = 5 * 60_000;
const BACKGROUND_REFRESH_MIN_MS = 45_000;
const AVATAR_PREFETCH_LIMIT = 8;
const DISK_RING_LIMIT = 24;

export type StoryRingCacheEntry = {
  viewerId: string;
  rings: StoryRing[];
  nextCursor: string | null;
  savedAt: number;
};

let memoryEntry: StoryRingCacheEntry | null = null;
let inflightKey: string | null = null;
let inflightPromise: Promise<StoryRingCacheEntry | null> | null = null;
let lastFetchAtByKey = new Map<string, number>();
const prefetchedAvatarUrls = new Set<string>();

function buildKey(viewerId: string | null): string {
  return viewerId ?? 'anon';
}

export function readMemoryStoryRingCache(viewerId: string | null): StoryRingCacheEntry | null {
  const key = buildKey(viewerId);
  if (!memoryEntry || memoryEntry.viewerId !== key) return null;
  return memoryEntry;
}

export function hasFreshStoryRingCache(viewerId: string | null, useCache = true): boolean {
  if (!useCache) return false;
  const cached = readMemoryStoryRingCache(viewerId);
  return Boolean(cached && Date.now() - cached.savedAt < CACHE_TTL_MS);
}

export async function hydrateStoryRingCacheFromDisk(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    if (!raw) return;
    memoryEntry = JSON.parse(raw) as StoryRingCacheEntry;
  } catch {
    memoryEntry = null;
  }
}

function writeStoryRingCache(entry: StoryRingCacheEntry, useCache = true): void {
  if (!useCache) return;
  memoryEntry = {
    ...entry,
    rings: entry.rings.slice(0, DISK_RING_LIMIT),
  };
  void AsyncStorage.setItem(DISK_KEY, JSON.stringify(memoryEntry)).catch(() => {});
}

export function prefetchStoryRingAvatars(rings: StoryRing[], limit = AVATAR_PREFETCH_LIMIT): void {
  let queued = 0;

  for (const ring of rings) {
    if (queued >= limit) break;
    const url = ring.avatarUrl;
    if (!url || prefetchedAvatarUrls.has(url)) continue;
    prefetchedAvatarUrls.add(url);
    queued += 1;
    void Image.prefetch(url, 'memory-disk');
  }
}

export function hydrateStoryRingsIntoStore(viewerId: string | null, useCache = true): boolean {
  if (!useCache) return false;
  const key = buildKey(viewerId);
  const store = useStoryRingStore.getState();

  if (store.viewerId && store.viewerId !== key) {
    store.reset();
  }

  if (store.rings.length > 0 && store.viewerId === key) {
    return true;
  }

  const cached = readMemoryStoryRingCache(viewerId);
  if (!cached?.rings.length) return false;

  store.hydrateFromCache(cached.rings, cached.nextCursor, key);
  prefetchStoryRingAvatars(cached.rings);
  return true;
}

export function invalidateStoryRingCache(): void {
  memoryEntry = null;
  inflightKey = null;
  inflightPromise = null;
  lastFetchAtByKey.clear();
  prefetchedAvatarUrls.clear();
  useStoryRingStore.getState().reset();
  void AsyncStorage.removeItem(DISK_KEY).catch(() => {});
}

function shouldSkipBackgroundRefresh(key: string, hasStoreRings: boolean): boolean {
  if (!hasStoreRings) return false;
  const lastFetch = lastFetchAtByKey.get(key) ?? memoryEntry?.savedAt ?? 0;
  return Date.now() - lastFetch < BACKGROUND_REFRESH_MIN_MS;
}

function applyFetchResult(
  key: string,
  result: { rings: StoryRing[]; nextCursor: string | null },
  options?: { background?: boolean; animate?: boolean; useCache?: boolean },
): StoryRingCacheEntry {
  const entry: StoryRingCacheEntry = {
    viewerId: key,
    rings: result.rings,
    nextCursor: result.nextCursor,
    savedAt: Date.now(),
  };

  const current = useStoryRingStore.getState();
  const background = options?.background ?? (current.rings.length > 0 && current.viewerId === key);

  if (background && current.rings.length > 0 && current.viewerId === key) {
    current.applyRingsUpdate(result.rings, result.nextCursor, { animate: options?.animate ?? false });
  } else {
    current.setRings(result.rings);
    current.setNextCursor(result.nextCursor);
    current.setViewerId(key);
  }

  writeStoryRingCache(entry, options?.useCache ?? true);
  prefetchStoryRingAvatars(result.rings);
  lastFetchAtByKey.set(key, entry.savedAt);
  return entry;
}

export async function prefetchStoryRings(
  viewerId: string | null,
  options?: { background?: boolean; animate?: boolean; force?: boolean; useCache?: boolean },
): Promise<StoryRingCacheEntry | null> {
  const useCache = options?.useCache ?? true;
  const key = buildKey(viewerId);
  const cached = useCache && memoryEntry?.viewerId === key ? memoryEntry : null;
  const store = useStoryRingStore.getState();
  const hasStoreRings = store.rings.length > 0 && store.viewerId === key;
  const background = options?.background ?? hasStoreRings;

  if (!background && !hasStoreRings && useCache) {
    hydrateStoryRingsIntoStore(viewerId, useCache);
  }

  if (!options?.force && background && useCache && shouldSkipBackgroundRefresh(key, hasStoreRings)) {
    return cached;
  }

  if (
    useCache &&
    !options?.force &&
    cached &&
    Date.now() - cached.savedAt < CACHE_TTL_MS &&
    !background &&
    !options?.animate
  ) {
    void prefetchStoryRings(viewerId, { background: true, animate: false, useCache });
    return cached;
  }

  if (inflightKey === key && inflightPromise) {
    return inflightPromise;
  }

  if (!background) {
    store.setLoading(true);
  }

  inflightKey = key;
  inflightPromise = fetchStoryRings({
    viewerId,
    limit: STORY_RING_INITIAL_PAGE_SIZE,
  })
    .then((result) => applyFetchResult(key, result, { ...options, useCache }))
    .catch(() => null)
    .finally(() => {
      useStoryRingStore.getState().setLoading(false);
      inflightKey = null;
      inflightPromise = null;
    });

  return inflightPromise;
}
