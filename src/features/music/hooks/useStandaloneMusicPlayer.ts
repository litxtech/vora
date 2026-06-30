import { useEffect, useRef } from 'react';
import type { AudioPlayer } from 'expo-audio';
import type { MusicPlaybackConfig } from '@/features/music/types';
import {
  loadReelMusicPlayer,
  registerStudioMusicPlayer,
  releaseAudioPlayer,
} from '@/features/music/services/audioPreview';

type UseStandaloneMusicPlayerInput = {
  config: MusicPlaybackConfig | null | undefined;
  /** Kart ekranda ve müzik tanımlı */
  scopeActive: boolean;
  /** Kullanıcı sesi açtı */
  playing: boolean;
};

const LOOP_CHECK_MS = 2_000;

function runOnPlayer(player: AudioPlayer | null, fn: (player: AudioPlayer) => void): boolean {
  if (!player) return false;
  try {
    fn(player);
    return true;
  } catch {
    return false;
  }
}

export function useStandaloneMusicPlayer({ config, scopeActive, playing }: UseStandaloneMusicPlayerInput): void {
  const playerRef = useRef<AudioPlayer | null>(null);
  const configRef = useRef(config);
  const loadGenRef = useRef(0);
  const playingRef = useRef(playing);
  const loadingRef = useRef(false);

  configRef.current = config;
  playingRef.current = playing;

  const shouldHoldPlayer = scopeActive && (playing || playerRef.current != null);

  useEffect(() => {
    if (!scopeActive) {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
      playerRef.current = null;
      loadingRef.current = false;
      return;
    }

    if (!playing || !config?.audioUrl) {
      return;
    }

    if (playerRef.current) {
      const player = playerRef.current;
      if (!runOnPlayer(player, (p) => {
        if (!p.playing) void p.play();
      })) {
        playerRef.current = null;
      }
      return;
    }

    if (loadingRef.current) return;

    const generation = ++loadGenRef.current;
    let cancelled = false;
    loadingRef.current = true;

    void loadReelMusicPlayer(config.audioUrl, config.musicVolume)
      .then(async (player) => {
        loadingRef.current = false;
        if (cancelled || generation !== loadGenRef.current) {
          releaseAudioPlayer(player);
          return;
        }

        playerRef.current = player;
        registerStudioMusicPlayer(player);

        const snapshot = configRef.current;
        const startSec = snapshot?.musicStartSec ?? config.musicStartSec;
        try {
          await player.seekTo(startSec);
        } catch {
          /* buffer gecikmesi */
        }

        if (playingRef.current) {
          player.play();
        } else {
          player.pause();
        }
      })
      .catch(() => {
        loadingRef.current = false;
        if (!cancelled) playerRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [scopeActive, playing, config?.audioUrl, config?.musicVolume, config?.musicStartSec, config?.musicEndSec]);

  useEffect(() => {
    if (!shouldHoldPlayer || playing) return;

    const player = playerRef.current;
    if (!player) return;

    runOnPlayer(player, (p) => {
      if (p.playing) p.pause();
    });
  }, [shouldHoldPlayer, playing]);

  useEffect(() => {
    if (!config?.audioUrl || !playerRef.current) return;

    const player = playerRef.current;
    runOnPlayer(player, (p) => {
      p.volume = config.musicVolume;
    });
  }, [config?.musicVolume, config?.audioUrl]);

  useEffect(() => {
    if (!scopeActive || !playing || !config?.audioUrl) return;

    const interval = setInterval(() => {
      const snapshot = configRef.current;
      const boundPlayer = playerRef.current;
      if (!boundPlayer || !snapshot || !playingRef.current) return;

      if (!runOnPlayer(boundPlayer, (p) => {
        p.volume = snapshot.musicVolume;
      })) {
        playerRef.current = null;
        return;
      }

      let currentTime = 0;
      let isPlaying = false;
      if (!runOnPlayer(boundPlayer, (p) => {
        currentTime = p.currentTime;
        isPlaying = p.playing;
      })) {
        playerRef.current = null;
        return;
      }

      if (!isPlaying) return;

      if (currentTime >= snapshot.musicEndSec - 0.08) {
        void boundPlayer.seekTo(snapshot.musicStartSec).then(() => {
          if (playingRef.current) void boundPlayer.play();
        }).catch(() => {
          playerRef.current = null;
        });
      }
    }, LOOP_CHECK_MS);

    return () => clearInterval(interval);
  }, [scopeActive, playing, config?.audioUrl, config?.musicEndSec, config?.musicVolume]);

  useEffect(
    () => () => {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
      playerRef.current = null;
      loadingRef.current = false;
    },
    [],
  );
}
