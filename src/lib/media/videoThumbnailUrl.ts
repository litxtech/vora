import { extractMuxPlaybackId, getMuxThumbnailUrl } from '@/lib/mux/client';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';

/** Paylaşım kartı / önizleme için video URL → poster görseli */
export function resolveVideoThumbnailUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  if (isProcessingVideoUrl(trimmed)) return null;

  const playbackId = extractMuxPlaybackId(trimmed);
  if (playbackId) return getMuxThumbnailUrl(playbackId);

  if (!isVideoUrl(trimmed)) return trimmed;

  return null;
}
