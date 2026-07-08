import { useEffect, useRef } from 'react';
import type { AudioPlayer } from 'expo-audio';
import type { MusicPlaybackConfig } from '@/features/music/types';
import {
  acquireReelMusicPlayer,
  prefetchReelMusic,
} from '@/features/music/services/reelMusicSync';

const LOOP_CHECK_MS = 1_500;

type UseStoryImageMusicPlayerInput = {
  itemId: string;
  config: MusicPlaybackConfig | null | undefined;
  active: boolean;
};

function runOnPlayer(player: AudioPlayer | null, fn: (p: AudioPlayer) => void): boolean {
  if (!player) return false;
  try {
    fn(player);
    return true;
  } catch {
    return false;
  }
}

/** Fotoğraf hikâyesi müziği — reel havuzu ile önceden ısıtılmış, gecikmesiz başlar. */
export function useStoryImageMusicPlayer({
  itemId,
  config,
  active,
}: UseStoryImageMusicPlayerInput): void {
  const playerRef = useRef<AudioPlayer | null>(null);
  const ownerRef = useRef<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (config) prefetchReelMusic(config);
  }, [config]);

  useEffect(() => {
    if (!active || !config?.audioUrl) {
      if (ownerRef.current === itemId) {
        runOnPlayer(playerRef.current, (p) => p.pause());
        playerRef.current = null;
        ownerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const audioUrl = config.audioUrl;

    void (async () => {
      const player = await acquireReelMusicPlayer(audioUrl, config.musicVolume);
      if (cancelled) return;

      playerRef.current = player;
      ownerRef.current = itemId;

      try {
        await player.seekTo(config.musicStartSec);
      } catch {
        /* buffer */
      }
      if (!cancelled && ownerRef.current === itemId) {
        player.play();
      }
    })();

    return () => {
      cancelled = true;
      if (ownerRef.current === itemId) {
        runOnPlayer(playerRef.current, (p) => p.pause());
        playerRef.current = null;
        ownerRef.current = null;
      }
    };
  }, [active, config, itemId]);

  useEffect(() => {
    if (!active || !config?.audioUrl) return;

    const interval = setInterval(() => {
      const snapshot = configRef.current;
      if (!snapshot?.audioUrl || ownerRef.current !== itemId) return;

      const player = playerRef.current;
      if (!runOnPlayer(player, (p) => {
        p.volume = snapshot.musicVolume;
        if (!p.playing) return;
        if (p.currentTime >= snapshot.musicEndSec - 0.08) {
          void p.seekTo(snapshot.musicStartSec).then(() => p.play());
        }
      })) {
        playerRef.current = null;
      }
    }, LOOP_CHECK_MS);

    return () => clearInterval(interval);
  }, [active, config?.audioUrl, itemId]);
}
