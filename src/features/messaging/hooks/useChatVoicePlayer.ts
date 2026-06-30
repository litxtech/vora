import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { releaseAudioPlayer } from '@/features/music/services/audioPreview';

let activeChatVoicePlayer: AudioPlayer | null = null;
let activeChatVoiceOwner: symbol | null = null;

function stopGlobalChatVoice(exceptOwner?: symbol): void {
  if (activeChatVoiceOwner && activeChatVoiceOwner !== exceptOwner) {
    releaseAudioPlayer(activeChatVoicePlayer);
    activeChatVoicePlayer = null;
    activeChatVoiceOwner = null;
  }
}

export function useChatVoicePlayer(uri: string) {
  const trimmedUri = uri.trim();
  const hasUri = trimmedUri.length > 0;
  const ownerRef = useRef(Symbol('chat-voice'));
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const releaseLocal = useCallback(() => {
    if (playerRef.current) {
      releaseAudioPlayer(playerRef.current);
      if (activeChatVoicePlayer === playerRef.current) {
        activeChatVoicePlayer = null;
        activeChatVoiceOwner = null;
      }
      playerRef.current = null;
    }
    setPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => () => releaseLocal(), [releaseLocal]);

  const ensurePlayer = useCallback(async () => {
    if (!hasUri) return null;
    if (playerRef.current) return playerRef.current;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const player = createAudioPlayer({ uri: trimmedUri });
    playerRef.current = player;
    player.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) return;
      const duration = status.duration ?? 0;
      const position = status.currentTime ?? 0;
      if (duration > 0) setProgress(Math.min(1, position / duration));
      if (status.didJustFinish) {
        setPlaying(false);
        setProgress(0);
        try {
          player.seekTo(0);
        } catch {
          /* ignore */
        }
      }
    });
    return player;
  }, [hasUri, trimmedUri]);

  const play = useCallback(async () => {
    if (!hasUri) return;
    stopGlobalChatVoice(ownerRef.current);
    const player = await ensurePlayer();
    if (!player) return;
    activeChatVoicePlayer = player;
    activeChatVoiceOwner = ownerRef.current;
    player.play();
    setPlaying(true);
  }, [ensurePlayer, hasUri]);

  const pause = useCallback(() => {
    if (!hasUri) return;
    playerRef.current?.pause();
    setPlaying(false);
  }, [hasUri]);

  const toggle = useCallback(async () => {
    if (!hasUri) return;
    if (playing) {
      pause();
      return;
    }
    await play();
  }, [hasUri, pause, play, playing]);

  return { playing, progress, toggle, pause, releaseLocal };
}
