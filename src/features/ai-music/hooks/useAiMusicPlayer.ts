import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from 'expo-audio';
import {
  loadAudioPreviewPlayer,
  releaseAudioPlayer,
  stopMusicPreview,
} from '@/features/music/services/audioPreview';

export function useAiMusicPlayer(audioUrl: string | null, fallbackDurationSec: number) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const loadingRef = useRef<Promise<AudioPlayer | null> | null>(null);
  const clipEndRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSec);

  const release = useCallback(() => {
    clipEndRef.current = null;
    loadingRef.current = null;
    if (playerRef.current) {
      releaseAudioPlayer(playerRef.current);
      playerRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    release();
    setPosition(0);
    setDuration(fallbackDurationSec);
  }, [audioUrl, fallbackDurationSec, release]);

  useEffect(() => () => release(), [release]);

  const ensure = useCallback(async () => {
    if (!audioUrl) return null;
    if (playerRef.current) return playerRef.current;
    if (loadingRef.current) return loadingRef.current;

    const pending = (async () => {
      stopMusicPreview();
      const player = await loadAudioPreviewPlayer(audioUrl, 1);
      player.addListener('playbackStatusUpdate', (status) => {
        if (!status.isLoaded) return;
        const nextPosition = status.currentTime ?? 0;
        const nextDuration = status.duration ?? 0;
        setPosition(nextPosition);
        if (nextDuration > 0.2) setDuration(nextDuration);
        const clipEnd = clipEndRef.current;
        if (clipEnd != null && nextPosition >= clipEnd - 0.08) {
          clipEndRef.current = null;
          player.pause();
          setPlaying(false);
          setPosition(clipEnd);
          return;
        }
        if (status.didJustFinish) {
          setPlaying(false);
          setPosition(0);
          void player.seekTo(0);
        }
      });
      playerRef.current = player;
      return player;
    })();

    loadingRef.current = pending;
    try {
      return await pending;
    } finally {
      loadingRef.current = null;
    }
  }, [audioUrl]);

  const seek = useCallback(
    async (sec: number) => {
      const cap = Math.max(duration, fallbackDurationSec, 0);
      const next = Math.min(cap, Math.max(0, sec));
      setPosition(next);
      const player = playerRef.current ?? (await ensure());
      if (!player) return;
      try {
        await player.seekTo(next);
      } catch {
        /* buffer henüz yok */
      }
    },
    [duration, ensure, fallbackDurationSec],
  );

  const toggle = useCallback(async () => {
    if (!audioUrl) return;
    const player = await ensure();
    if (!player) return;
    if (playing) {
      clipEndRef.current = null;
      player.pause();
      setPlaying(false);
      return;
    }
    clipEndRef.current = null;
    player.play();
    setPlaying(true);
  }, [audioUrl, ensure, playing]);

  const playRange = useCallback(
    async (startSec: number, endSec: number) => {
      if (!audioUrl) return;
      const player = await ensure();
      if (!player) return;
      const start = Math.max(0, startSec);
      const end = Math.max(start + 0.2, endSec);
      clipEndRef.current = end;
      setPosition(start);
      try {
        await player.seekTo(start);
      } catch {
        /* yoksay */
      }
      player.play();
      setPlaying(true);
    },
    [audioUrl, ensure],
  );

  const skip = useCallback(
    async (deltaSec: number) => {
      await seek(position + deltaSec);
    },
    [position, seek],
  );

  return {
    playing,
    position,
    duration: Math.max(duration, fallbackDurationSec),
    toggle,
    seek,
    skip,
    playRange,
    stop: release,
  };
}
