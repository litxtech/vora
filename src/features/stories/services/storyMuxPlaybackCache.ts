import { getMuxPlaybackUrl } from '@/lib/mux/client';

const cache = new Map<string, string>();

export function getCachedMuxPlaybackUrl(videoId: string): string | null {
  return cache.get(videoId) ?? null;
}

export function setCachedMuxPlaybackUrl(videoId: string, playbackId: string): string {
  const url = getMuxPlaybackUrl(playbackId);
  cache.set(videoId, url);
  return url;
}

export function rememberMuxPlaybackUrl(videoId: string, playbackUrl: string): void {
  cache.set(videoId, playbackUrl);
}
