import { setVideoCacheSizeAsync } from 'expo-video';
import { getReelsVideoCacheBytes } from '@/lib/device/androidPerfProfile';

let initialized = false;

/** Video önbelleği — Reels sekmesine girmeden önce bir kez çağır. */
export async function initReelsPlayback(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    await setVideoCacheSizeAsync(getReelsVideoCacheBytes());
  } catch {
    /* cache zaten ayarlı veya player aktif */
  }
}
