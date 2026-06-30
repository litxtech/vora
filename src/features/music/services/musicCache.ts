import type { MusicCategory, MusicTrack } from '@/features/music/types';
import { MUSIC_CACHE_TTL_MS } from '@/features/music/constants';
import { resolvePlayableMusicUrl } from '@/features/music/constants/demoTracks';

type CacheEntry<T> = { data: T; expiresAt: number };

const trackCache = new Map<string, CacheEntry<MusicTrack[]>>();
const categoryCache = new Map<string, CacheEntry<MusicCategory[]>>();

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && entry.expiresAt > Date.now();
}

export function getCachedTracks(key: string): MusicTrack[] | null {
  const entry = trackCache.get(key);
  if (!isFresh(entry)) return null;
  return entry.data.map((track) => ({
    ...track,
    audioUrl: resolvePlayableMusicUrl(track.audioUrl, track.id),
  }));
}

export function setCachedTracks(key: string, tracks: MusicTrack[]): void {
  trackCache.set(key, { data: tracks, expiresAt: Date.now() + MUSIC_CACHE_TTL_MS });
}

export function getCachedCategories(): MusicCategory[] | null {
  const entry = categoryCache.get('all');
  return isFresh(entry) ? entry.data : null;
}

export function setCachedCategories(categories: MusicCategory[]): void {
  categoryCache.set('all', { data: categories, expiresAt: Date.now() + MUSIC_CACHE_TTL_MS });
}

export function invalidateMusicCache(): void {
  trackCache.clear();
  categoryCache.clear();
}
