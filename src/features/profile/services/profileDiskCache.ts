import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedItem } from '@/features/feed/types';
import {
  setCachedProfileBundle,
  setCachedTabPosts,
  type ProfileScreenBundle,
} from '@/features/profile/services/profileSessionCache';

const DISK_KEY = 'profile:own_bundle_v1';
const POSTS_TAB_LIMIT = 24;

export type ProfileDiskSnapshot = {
  userId: string;
  bundle: ProfileScreenBundle;
  postsTab: FeedItem[];
  savedAt: number;
};

let memorySnapshot: ProfileDiskSnapshot | null = null;

export function readMemoryOwnProfileDisk(userId: string): ProfileDiskSnapshot | null {
  if (memorySnapshot?.userId !== userId) return null;
  return memorySnapshot;
}

export async function readOwnProfileDiskCache(userId: string): Promise<ProfileDiskSnapshot | null> {
  const fromMemory = readMemoryOwnProfileDisk(userId);
  if (fromMemory) return fromMemory;

  try {
    const raw = await AsyncStorage.getItem(DISK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileDiskSnapshot;
    if (
      parsed.userId !== userId ||
      !parsed.bundle?.profile ||
      !parsed.bundle?.stats ||
      !parsed.bundle?.relationship
    ) {
      return null;
    }
    memorySnapshot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeOwnProfileDiskCache(
  userId: string,
  bundle: ProfileScreenBundle,
  postsTab: FeedItem[],
): Promise<void> {
  const snapshot: ProfileDiskSnapshot = {
    userId,
    bundle,
    postsTab: postsTab.slice(0, POSTS_TAB_LIMIT),
    savedAt: Date.now(),
  };
  memorySnapshot = snapshot;
  try {
    await AsyncStorage.setItem(DISK_KEY, JSON.stringify(snapshot));
  } catch {
    // disk cache best-effort
  }
}

/** Disk önbelleğini bellek oturum önbelleğine taşır. */
export async function hydrateOwnProfileDiskCache(
  userId: string,
  viewerId: string | null,
): Promise<boolean> {
  const snapshot = await readOwnProfileDiskCache(userId);
  if (!snapshot) return false;

  setCachedProfileBundle(userId, viewerId, snapshot.bundle);
  if (snapshot.postsTab.length > 0) {
    setCachedTabPosts(userId, 'posts', viewerId, snapshot.postsTab);
  }
  return true;
}

export async function clearOwnProfileDiskCache(): Promise<void> {
  memorySnapshot = null;
  try {
    await AsyncStorage.removeItem(DISK_KEY);
  } catch {
    // best-effort
  }
}
