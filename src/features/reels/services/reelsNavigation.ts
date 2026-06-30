import { router, type Href } from 'expo-router';
import { extractMuxPlaybackId } from '@/lib/mux/client';
import { isProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { useFeedMediaViewerStore } from '@/features/feed/store/feedMediaViewerStore';
import { fetchReelByPlaybackId } from '@/features/reels/services/reelsData';
import { initReelsPlayback } from '@/features/reels/services/initReelsPlayback';
import { primeReelForOpen } from '@/features/reels/services/reelWarmup';
import { useReelsViewerStore } from '@/features/reels/store/reelsViewerStore';
import type { ReelItem } from '@/features/reels/types';

export type ReelOpenHints = Pick<ReelItem, 'id' | 'playbackId' | 'thumbnailUrl' | 'musicPlayback'>;

function primeReelHints(hints: Partial<ReelOpenHints> & { id: string }): void {
  if (!hints.playbackId) return;
  primeReelForOpen({
    id: hints.id,
    playbackId: hints.playbackId,
    thumbnailUrl: hints.thumbnailUrl ?? null,
    musicPlayback: hints.musicPlayback ?? null,
  });
}

export function openReelsAtReel(reelId: string, hints?: Partial<ReelOpenHints>) {
  if (!reelId) return;
  useFeedMediaViewerStore.getState().dismissAll();
  void initReelsPlayback();
  if (hints) {
    primeReelHints({ id: reelId, ...hints });
  }
  useReelsViewerStore.getState().openSession(reelId);
  router.push('/(tabs)/reels' as Href);
}

export function openReelsViewer(items: ReelItem[], startIndex: number) {
  const reel = items[startIndex];
  if (!reel) return;
  openReelsAtReel(reel.id, reel);
}

export function openReelById(reelId: string) {
  openReelsAtReel(reelId);
}

export async function openVideoInReels(mediaUrl: string, viewerId: string | null): Promise<boolean> {
  if (!isVideoUrl(mediaUrl) || isProcessingVideoUrl(mediaUrl)) return false;

  const playbackId = extractMuxPlaybackId(mediaUrl);
  if (playbackId) {
    const reel = await fetchReelByPlaybackId(playbackId, viewerId);
    if (reel) {
      openReelsAtReel(reel.id, reel);
      return true;
    }
  }

  return false;
}

export async function openFeedVideoItem(item: {
  sourceType: string;
  sourceId: string;
  mediaUrls: string[];
}, viewerId: string | null, mediaIndex = 0): Promise<boolean> {
  if (item.sourceType === 'reel') {
    openReelsAtReel(item.sourceId);
    return true;
  }

  const mediaUrl = item.mediaUrls[mediaIndex];
  if (mediaUrl && isVideoUrl(mediaUrl)) {
    return openVideoInReels(mediaUrl, viewerId);
  }

  return false;
}
