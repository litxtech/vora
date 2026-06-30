import { useEffect, useRef } from 'react';
import type { VideoPlayer } from 'expo-video';
import type { MusicPlaybackConfig } from '@/features/music/types';
import {
  loadAudioPreviewPlayer,
  registerStudioMusicPlayer,
  releaseAudioPlayer,
} from '@/features/music/services/audioPreview';

type UsePublishedMusicPlayerInput = {
  videoPlayer: VideoPlayer;
  config: MusicPlaybackConfig | null | undefined;
  active: boolean;
};

function musicTimeForVideo(videoTimeSec: number, config: MusicPlaybackConfig): number {
  return Math.min(config.musicStartSec + Math.max(0, videoTimeSec), config.musicEndSec);
}

/** Tek ekran önizlemesi (compose / reel oluştur) — reels feed için reelMusicSync kullan. */
export function usePublishedMusicPlayer({ videoPlayer, config, active }: UsePublishedMusicPlayerInput): void {
  const playerRef = useRef<Awaited<ReturnType<typeof loadAudioPreviewPlayer>> | null>(null);
  const configRef = useRef(config);
  const loadGenRef = useRef(0);
  const lastSeekRef = useRef(0);

  configRef.current = config;

  useEffect(() => {
    if (!config?.audioUrl || !active) {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
      playerRef.current = null;
      return;
    }

    const generation = ++loadGenRef.current;
    let cancelled = false;

    void loadAudioPreviewPlayer(config.audioUrl, config.musicVolume)
      .then(async (player) => {
        if (cancelled || generation !== loadGenRef.current) {
          releaseAudioPlayer(player);
          return;
        }

        playerRef.current = player;
        registerStudioMusicPlayer(player);

        const target = musicTimeForVideo(videoPlayer.currentTime, config);
        await player.seekTo(target);
        if (videoPlayer.playing) player.play();
      })
      .catch(() => {
        if (!cancelled) playerRef.current = null;
      });

    return () => {
      cancelled = true;
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
      playerRef.current = null;
    };
  }, [active, config?.audioUrl, config?.musicVolume, videoPlayer]);

  useEffect(() => {
    if (!active || !config?.audioUrl) return;

    const muteOriginal = config.originalAudioVolume <= 0.001;
    try {
      videoPlayer.muted = muteOriginal || Boolean(config.audioUrl);
      videoPlayer.volume = muteOriginal ? 0 : config.originalAudioVolume;
    } catch {
      /* player released */
    }

    const subscription = videoPlayer.addListener('timeUpdate', ({ currentTime }) => {
      const player = playerRef.current;
      const snapshot = configRef.current;
      if (!player || !snapshot) return;

      player.volume = snapshot.musicVolume;
      const target = musicTimeForVideo(currentTime, snapshot);

      if (!videoPlayer.playing) {
        if (player.playing) player.pause();
        return;
      }

      if (!player.playing) {
        void player.seekTo(target).then(() => player.play());
        return;
      }

      const drift = Math.abs(player.currentTime - target);
      const now = Date.now();
      if (drift > 0.85 && now - lastSeekRef.current > 900) {
        lastSeekRef.current = now;
        void player.seekTo(target);
      }
    });

    return () => subscription.remove();
  }, [active, config, videoPlayer]);

  useEffect(
    () => () => {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
    },
    [],
  );
}
