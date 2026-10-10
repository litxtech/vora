import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from 'expo-audio';
import { AI_MUSIC_VOICE_MAX_SEC } from '@/features/ai-music/constants';
import { releaseAudioPlayer } from '@/features/music/services/audioPreview';

export type AiMusicVoicePhase = 'idle' | 'recording' | 'preview';

function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useAiMusicVoiceRecorder() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    extension: '.m4a',
  });
  const recorderState = useAudioRecorderState(recorder, 200);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);

  const [phase, setPhase] = useState<AiMusicVoicePhase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [playing, setPlaying] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (playerRef.current) {
      releaseAudioPlayer(playerRef.current);
      playerRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => () => {
    clearTimer();
    stopPlayback();
  }, [clearTimer, stopPlayback]);

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearTimer();
    const elapsed = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : elapsedSec;
    startedAtRef.current = null;
    if (recorderState.isRecording) {
      try {
        await recorder.stop();
      } catch {
        /* kayıt zaten kapalı */
      }
    }
    const nextUri = recorder.uri ?? null;
    const nextDuration = Math.max(0, elapsed);
    setUri(nextUri);
    setDurationSec(nextDuration);
    setElapsedSec(nextDuration);
    setPhase(nextUri ? 'preview' : 'idle');
    stoppingRef.current = false;
  }, [clearTimer, elapsedSec, recorder, recorderState.isRecording]);

  useEffect(() => {
    if (phase === 'recording' && elapsedSec >= AI_MUSIC_VOICE_MAX_SEC) {
      void stop();
    }
  }, [elapsedSec, phase, stop]);

  const start = useCallback(async () => {
    stoppingRef.current = false;
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Mikrofon izni gerekli', 'Kendi sesini kaydetmek için mikrofon izni ver.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayarlar', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }

    stopPlayback();
    setUri(null);
    setDurationSec(0);
    setElapsedSec(0);
    startedAtRef.current = Date.now();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
    clearTimer();
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      setElapsedSec((Date.now() - startedAtRef.current) / 1000);
    }, 200);
  }, [clearTimer, recorder, stopPlayback]);

  const discard = useCallback(async () => {
    clearTimer();
    stopPlayback();
    startedAtRef.current = null;
    if (recorderState.isRecording) {
      try {
        await recorder.stop();
      } catch {
        /* yoksay */
      }
    }
    setUri(null);
    setDurationSec(0);
    setElapsedSec(0);
    setPhase('idle');
  }, [clearTimer, recorder, recorderState.isRecording, stopPlayback]);

  const togglePlayback = useCallback(async () => {
    if (!uri) return;
    if (playing) {
      stopPlayback();
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const player = createAudioPlayer({ uri });
    playerRef.current = player;
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        subscription.remove();
        stopPlayback();
      }
    });
    player.play();
    setPlaying(true);
  }, [playing, stopPlayback, uri]);

  return {
    phase,
    elapsedLabel: formatClock(phase === 'recording' ? elapsedSec : durationSec),
    durationSec,
    uri,
    playing,
    maxLabel: formatClock(AI_MUSIC_VOICE_MAX_SEC),
    start,
    stop,
    discard,
    togglePlayback,
  };
}
