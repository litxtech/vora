import { useEffect, useState } from 'react';
import { syncMuxVideo } from '@/lib/mux/client';
import { isProcessingVideoUrl, parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import {
  getCachedMuxPlaybackUrl,
  setCachedMuxPlaybackUrl,
} from '@/features/stories/services/storyMuxPlaybackCache';
import { kickstartMuxSync } from '@/services/video/muxPoll';

function pollDelayMs(elapsedMs: number): number {
  if (elapsedMs < 20_000) return 500;
  if (elapsedMs < 60_000) return 1200;
  return 2500;
}

/** Mux işlenirken hikâye videosunu oynatılabilir HLS URL'sine çevirir. */
export function useStoryMuxPlaybackUrl(mediaUrl: string | null | undefined): {
  playbackUrl: string | null;
  isProcessing: boolean;
} {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(() => {
    if (!mediaUrl) return null;
    if (!isProcessingVideoUrl(mediaUrl)) return mediaUrl;
    const videoId = parseProcessingVideoId(mediaUrl);
    return videoId ? getCachedMuxPlaybackUrl(videoId) : null;
  });

  useEffect(() => {
    if (!mediaUrl) {
      setPlaybackUrl(null);
      return;
    }

    if (!isProcessingVideoUrl(mediaUrl)) {
      setPlaybackUrl(mediaUrl);
      return;
    }

    const videoId = parseProcessingVideoId(mediaUrl);
    if (!videoId) {
      setPlaybackUrl(null);
      return;
    }

    const cached = getCachedMuxPlaybackUrl(videoId);
    if (cached) {
      setPlaybackUrl(cached);
      return;
    }

    let cancelled = false;
    setPlaybackUrl(null);
    kickstartMuxSync(videoId);

    const started = Date.now();

    const poll = async () => {
      while (!cancelled) {
        try {
          const result = await syncMuxVideo(videoId);
          if (cancelled) return;
          if (result.status === 'ready' && result.playbackId) {
            setPlaybackUrl(setCachedMuxPlaybackUrl(videoId, result.playbackId));
            return;
          }
        } catch {
          /* tekrar dene */
        }
        await new Promise((resolve) => setTimeout(resolve, pollDelayMs(Date.now() - started)));
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  const isProcessing = Boolean(mediaUrl && isProcessingVideoUrl(mediaUrl) && !playbackUrl);
  return { playbackUrl: playbackUrl ?? (isProcessing ? null : mediaUrl ?? null), isProcessing };
}
