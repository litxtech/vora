import type { Sound } from '@/features/sounds/types';
import { SOUND_CACHE_TTL_MS } from '@/features/sounds/constants';

type CacheEntry<T> = { value: T; expiresAt: number };

const trackCache = new Map<string, CacheEntry<Sound[]>>();

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && entry.expiresAt > Date.now();
}

export function getCachedSounds(key: string): Sound[] | null {
  const entry = trackCache.get(key);
  return isFresh(entry) ? entry.value : null;
}

export function setCachedSounds(key: string, sounds: Sound[]): void {
  trackCache.set(key, { value: sounds, expiresAt: Date.now() + SOUND_CACHE_TTL_MS });
}

export function invalidateSoundCache(): void {
  trackCache.clear();
}
