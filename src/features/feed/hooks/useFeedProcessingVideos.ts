import { useEffect, useMemo, useRef } from 'react';
import { getMuxPlaybackUrl, syncMuxVideo } from '@/lib/mux/client';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import type { FeedItem } from '@/features/feed/types';
import { emitMuxVideoReady, subscribeMuxVideoReady } from '@/services/video/muxReadyEvents';
import { useLocalVideoPreviewStore } from '@/features/feed/store/localVideoPreviewStore';

function pollDelayMs(elapsedMs: number): number {
  // İlk 30 sn daha sık — paylaşım sonrası hızlı geçiş
  if (elapsedMs < 30_000) return 1_200;
  if (elapsedMs < 90_000) return 2_500;
  return 5_000;
}

function pendingSignature(items: FeedItem[]): string {
  const ids: string[] = [];
  for (const item of items) {
    item.mediaUrls.forEach((url) => {
      const videoId = parseProcessingVideoId(url);
      if (videoId) ids.push(`${item.id}:${videoId}`);
    });
  }
  return ids.sort().join('|');
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

  const pendingKey = useMemo(() => pendingSignature(items), [items]);

  useEffect(() => {
    if (!enabled || !pendingKey) return;

    const pending = new Map<string, { postId: string; mediaIndex: number }>();
    for (const item of itemsRef.current) {
      item.mediaUrls.forEach((url, index) => {
        const videoId = parseProcessingVideoId(url);
        if (videoId) pending.set(videoId, { postId: item.id, mediaIndex: index });
      });
    }

    if (pending.size === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const started = Date.now();

    const applyReady = (videoId: string, playbackId: string) => {
      const target = pending.get(videoId);
      if (!target) return;

      const item = itemsRef.current.find((row) => row.id === target.postId);
      if (item) {
        const urls = [...item.mediaUrls];
        if (target.mediaIndex >= 0 && target.mediaIndex < urls.length) {
          urls[target.mediaIndex] = getMuxPlaybackUrl(playbackId);
          updateItemRef.current(target.postId, { mediaUrls: urls });
        }
      }

      useLocalVideoPreviewStore.getState().clearPreview(videoId);
      pending.delete(videoId);
      emitMuxVideoReady(videoId);
    };

    const poll = async () => {
      if (cancelled || pending.size === 0) return;

      for (const [videoId] of [...pending.entries()]) {
        if (cancelled) return;

        try {
          const result = await syncMuxVideo(videoId);
          if (result.status === 'ready' && result.playbackId) {
            applyReady(videoId, result.playbackId);
          }
        } catch {
          // 403 / geçici hata — döngüyü öldürme, sonraki turda dene
        }
      }

      if (!cancelled && pending.size > 0) {
        timer = setTimeout(poll, pollDelayMs(Date.now() - started));
      }
    };

    void poll();

    const unsub = subscribeMuxVideoReady((videoId) => {
      if (!pending.has(videoId)) return;
      // finalize zaten DB'yi güncelledi — bir sonraki poll veya anında sync
      void (async () => {
        try {
          const result = await syncMuxVideo(videoId);
          if (result.status === 'ready' && result.playbackId) {
            applyReady(videoId, result.playbackId);
          }
        } catch {
          // ignore
        }
      })();
    });

    return () => {
      cancelled = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, pendingKey]);
}
