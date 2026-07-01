import { useEffect, useState } from 'react';
import { getMuxPlaybackUrl, syncMuxVideo } from '@/lib/mux/client';
import { isProcessingVideoUrl, parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';

const POLL_MS = 2_000;

/** Mux işlenirken hikâye videosunu oynatılabilir HLS URL'sine çevirir. */
export function useStoryMuxPlaybackUrl(mediaUrl: string | null | undefined): {
  playbackUrl: string | null;
  isProcessing: boolean;
} {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(() => {
    if (!mediaUrl) return null;
    return isProcessingVideoUrl(mediaUrl) ? null : mediaUrl;
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

    let cancelled = false;
    setPlaybackUrl(null);

    const poll = async () => {
      while (!cancelled) {
        try {
          const result = await syncMuxVideo(videoId);
          if (cancelled) return;
          if (result.status === 'ready' && result.playbackId) {
            setPlaybackUrl(getMuxPlaybackUrl(result.playbackId));
            return;
          }
        } catch {
          /* tekrar dene */
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
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
