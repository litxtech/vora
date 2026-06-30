import { useEffect, useRef, useState } from 'react';
import { type VideoPlayer, type VideoSource } from 'expo-video';
import { isVideoPlayerAlive } from '@/features/reels/services/safeVideoPlayer';
import {
  acquireWarmVideoPlayer,
  stashWarmVideoPlayer,
} from '@/features/reels/services/reelVideoPreload';

/** Sıcak havuzdan devralır; unmount'ta release etmez — yukarı kaydırma için buffer korunur. */
export function useReelVideoPlayer(playbackId: string, videoSource: VideoSource): VideoPlayer {
  const [player] = useState(() => acquireWarmVideoPlayer(playbackId, videoSource));
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    return () => {
      const current = playerRef.current;
      if (!isVideoPlayerAlive(current)) return;
      stashWarmVideoPlayer(playbackId, current);
    };
  }, [playbackId]);

  return player;
}
