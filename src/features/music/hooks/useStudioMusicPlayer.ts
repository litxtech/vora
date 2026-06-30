import { useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from 'expo-audio';
import {
  playStudioMusicPreview,
  registerStudioMusicPlayer,
  releaseAudioPlayer,
  stopMusicPreview,
} from '@/features/music/services/audioPreview';

type StudioMusicPlayerInput = {
  audioUrl: string | null;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  trimStartSec: number;
  playheadSec: number;
  isPlaying: boolean;
};

function musicTimeForPlayhead(input: StudioMusicPlayerInput): number {
  const relative = Math.max(0, input.playheadSec - input.trimStartSec);
  return Math.min(input.musicStartSec + relative, input.musicEndSec);
}

export function useStudioMusicPlayer(input: StudioMusicPlayerInput): void {
  const playerRef = useRef<AudioPlayer | null>(null);
  const urlRef = useRef<string | null>(null);
  const inputRef = useRef(input);
  const [playerReady, setPlayerReady] = useState(false);

  inputRef.current = input;

  useEffect(() => {
    if (!input.audioUrl) {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
      playerRef.current = null;
      urlRef.current = null;
      setPlayerReady(false);
      return;
    }

    if (urlRef.current === input.audioUrl && playerRef.current) {
      playerRef.current.volume = input.musicVolume;
      return;
    }

    releaseAudioPlayer(playerRef.current);
    registerStudioMusicPlayer(null);
    playerRef.current = null;
    urlRef.current = input.audioUrl;
    setPlayerReady(false);

    let cancelled = false;

    void playStudioMusicPreview(input.audioUrl!, input.musicVolume)
      .then(async (player) => {
        if (cancelled) {
          releaseAudioPlayer(player);
          registerStudioMusicPlayer(null);
          return;
        }

        playerRef.current = player;
        const snapshot = inputRef.current;
        await player.seekTo(musicTimeForPlayhead(snapshot));

        if (snapshot.isPlaying) {
          player.play();
        } else {
          player.pause();
        }

        setPlayerReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          playerRef.current = null;
          setPlayerReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input.audioUrl, input.musicVolume]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !input.audioUrl || !playerReady) return;

    player.volume = input.musicVolume;
    const target = musicTimeForPlayhead(input);

    if (input.isPlaying) {
      stopMusicPreview();
      const drift = Math.abs(player.currentTime - target);
      if (drift > 0.35) {
        void player.seekTo(target).then(() => player.play());
      } else if (!player.playing) {
        player.play();
      }
      return;
    }

    player.pause();
    if (Math.abs(player.currentTime - target) > 0.08) {
      void player.seekTo(target);
    }
  }, [
    playerReady,
    input.isPlaying,
    input.playheadSec,
    input.trimStartSec,
    input.musicStartSec,
    input.musicEndSec,
    input.musicVolume,
    input.audioUrl,
  ]);

  useEffect(
    () => () => {
      releaseAudioPlayer(playerRef.current);
      registerStudioMusicPlayer(null);
    },
    [],
  );
}
