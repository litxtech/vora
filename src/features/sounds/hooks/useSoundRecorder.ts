import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { releaseAudioPlayer } from '@/features/music/services/audioPreview';
import { MAX_SOUND_DURATION_SEC } from '@/features/sounds/constants';

export type SoundRecorderPhase = 'idle' | 'recording' | 'paused' | 'preview';

function formatTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useSoundRecorder() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    extension: '.m4a',
  });
  const recorderState = useAudioRecorderState(recorder, 200);
  const playerRef = useRef<AudioPlayer | null>(null);

  const [phase, setPhase] = useState<SoundRecorderPhase>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDurationSec, setRecordedDurationSec] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedAccumRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (playerRef.current) {
      releaseAudioPlayer(playerRef.current);
      playerRef.current = null;
    }
    setPreviewPlaying(false);
  }, []);

  useEffect(() => () => {
    clearTimer();
    stopPreview();
  }, [clearTimer, stopPreview]);

  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  const syncElapsed = useCallback(() => {
    const base = pausedAccumRef.current;
    const segment = segmentStartRef.current ? (Date.now() - segmentStartRef.current) / 1000 : 0;
    const total = Math.min(MAX_SOUND_DURATION_SEC, base + segment);
    setElapsedSec(total);
    if (total >= MAX_SOUND_DURATION_SEC && recorderState.isRecording) {
      void stopRecordingRef.current();
    }
  }, [recorderState.isRecording]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (status.granted) return true;

    Alert.alert(
      'Mikrofon izni gerekli',
      'Ses kaydı için mikrofon iznine ihtiyacımız var.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ayarlar', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }, []);

  const startRecording = useCallback(async () => {
    if (!(await requestPermission())) return;

    stopPreview();
    setRecordedUri(null);
    pausedAccumRef.current = 0;
    segmentStartRef.current = Date.now();
    setElapsedSec(0);

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');

    clearTimer();
    timerRef.current = setInterval(syncElapsed, 200);
  }, [clearTimer, recorder, requestPermission, stopPreview, syncElapsed]);

  const pauseRecording = useCallback(() => {
    if (!recorderState.isRecording) return;
    recorder.pause();
    if (segmentStartRef.current) {
      pausedAccumRef.current += (Date.now() - segmentStartRef.current) / 1000;
      segmentStartRef.current = null;
    }
    clearTimer();
    setPhase('paused');
    setElapsedSec(Math.min(MAX_SOUND_DURATION_SEC, pausedAccumRef.current));
  }, [clearTimer, recorder, recorderState.isRecording]);

  const resumeRecording = useCallback(() => {
    if (recorderState.isRecording) return;
    if (pausedAccumRef.current >= MAX_SOUND_DURATION_SEC) return;
    segmentStartRef.current = Date.now();
    recorder.record();
    setPhase('recording');
    clearTimer();
    timerRef.current = setInterval(syncElapsed, 200);
  }, [clearTimer, recorder, recorderState.isRecording, syncElapsed]);

  const stopRecording = useCallback(async () => {
    clearTimer();
    if (recorderState.isRecording || phase === 'paused') {
      await recorder.stop();
    }

    if (segmentStartRef.current) {
      pausedAccumRef.current += (Date.now() - segmentStartRef.current) / 1000;
      segmentStartRef.current = null;
    }

    const duration = Math.min(MAX_SOUND_DURATION_SEC, pausedAccumRef.current);
    const uri = recorder.uri;

    setRecordedDurationSec(Math.max(1, duration));
    setElapsedSec(Math.max(1, duration));
    setRecordedUri(uri ?? null);
    setPhase(uri ? 'preview' : 'idle');
  }, [clearTimer, phase, recorder, recorderState.isRecording]);

  stopRecordingRef.current = stopRecording;

  const cancelRecording = useCallback(async () => {
    clearTimer();
    stopPreview();
    if (recorderState.isRecording || phase === 'paused') {
      try {
        await recorder.stop();
      } catch {
        /* ignore */
      }
    }
    pausedAccumRef.current = 0;
    segmentStartRef.current = null;
    setElapsedSec(0);
    setRecordedUri(null);
    setRecordedDurationSec(0);
    setPhase('idle');
  }, [clearTimer, phase, recorder, recorderState.isRecording, stopPreview]);

  const togglePreview = useCallback(async () => {
    if (!recordedUri) return;

    if (previewPlaying) {
      stopPreview();
      return;
    }

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const player = createAudioPlayer({ uri: recordedUri });
    playerRef.current = player;
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) stopPreview();
    });
    player.play();
    setPreviewPlaying(true);
  }, [previewPlaying, recordedUri, stopPreview]);

  const resetForRetake = useCallback(async () => {
    await cancelRecording();
  }, [cancelRecording]);

  return {
    phase,
    elapsedSec,
    elapsedLabel: formatTime(elapsedSec),
    maxSec: MAX_SOUND_DURATION_SEC,
    progress: Math.min(1, elapsedSec / MAX_SOUND_DURATION_SEC),
    recordedUri,
    recordedDurationSec,
    previewPlaying,
    isRecording: recorderState.isRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    togglePreview,
    resetForRetake,
  };
}
