import { extractMuxPlaybackId } from '@/lib/mux/client';
import type { ReelOpenHints } from '@/features/reels/services/reelsNavigation';
import type { SharedCardMetadata } from '../types';

export function resolveReelShareHints(
  reelId: string,
  metadata?: SharedCardMetadata | null,
): Partial<ReelOpenHints> {
  const playbackId =
    (metadata?.mediaUrl ? extractMuxPlaybackId(metadata.mediaUrl) : null) ??
    (metadata?.imageUrl ? extractMuxPlaybackId(metadata.imageUrl) : null);

  return {
    id: reelId,
    playbackId,
    thumbnailUrl: metadata?.imageUrl ?? null,
    musicPlayback: null,
  };
}

export function resolveReelShareOwnerLabel(metadata?: SharedCardMetadata | null): string {
  if (metadata?.username?.trim()) {
    return `@${metadata.username.trim()}`;
  }
  if (metadata?.title?.trim()) {
    return metadata.title.trim();
  }
  return 'Reel';
}
