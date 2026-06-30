import { extractMuxPlaybackId, getMuxPlaybackUrl } from '@/lib/mux/client';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';

/** Medya URL'sini oynatılabilir kaynağa çevirir (Mux thumbnail/HLS → HLS). */
export function resolvePlaybackUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || isProcessingVideoUrl(trimmed)) return null;

  const playbackId = extractMuxPlaybackId(trimmed);
  if (playbackId) {
    return getMuxPlaybackUrl(playbackId);
  }

  return trimmed;
}
