import { useEffect, useRef } from 'react';
import { getMuxPlaybackUrl, syncMuxVideo } from '@/lib/mux/client';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import type { FeedItem } from '@/features/feed/types';
import { emitMuxVideoReady } from '@/services/video/muxReadyEvents';

function pollDelayMs(elapsedMs: number): number {
  if (elapsedMs < 20_000) return 2_000;
  if (elapsedMs < 60_000) return 3_000;
  return 5_000;
}

/** Feed'deki "Video işleniyor..." kartlarını Mux hazır olunca otomatik oynatılabilir URL'ye çevirir. */
export function useFeedProcessingVideos(
  items: FeedItem[],
  updateItem: (id: string, patch: Partial<FeedItem>) => void,
  enabled: boolean,
): void {
  const itemsRef = useRef(items);
  const updateItemRef = useRef(updateItem);
  itemsRef.current = items;
  updateItemRef.current = updateItem;

  useEffect(() => {
    if (!enabled) return;

    const pending = new Map<string, { postId: string; mediaIndex: number }>();
    for (const item of items) {
      item.mediaUrls.forEach((url, index) => {
        const videoId = parseProcessingVideoId(url);
        if (videoId) pending.set(videoId, { postId: item.id, mediaIndex: index });
      });
    }

    if (pending.size === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const started = Date.now();

    const poll = async () => {
      if (cancelled || pending.size === 0) return;

      for (const [videoId, target] of [...pending.entries()]) {
        if (cancelled) return;

        const result = await syncMuxVideo(videoId);
        if (result.status !== 'ready' || !result.playbackId) continue;

        const item = itemsRef.current.find((row) => row.id === target.postId);
        if (item) {
          const urls = [...item.mediaUrls];
          if (target.mediaIndex >= 0 && target.mediaIndex < urls.length) {
            urls[target.mediaIndex] = getMuxPlaybackUrl(result.playbackId);
            updateItemRef.current(target.postId, { mediaUrls: urls });
          }
        }

        pending.delete(videoId);
        emitMuxVideoReady(videoId);
      }

      if (!cancelled && pending.size > 0) {
        timer = setTimeout(poll, pollDelayMs(Date.now() - started));
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, items]);
}
