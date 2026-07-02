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
import { MIN_SOUND_DURATION_SEC, SOUND_RECORD_HINT_SEC } from '@/features/sounds/constants';
import {
  pickSoundFromFiles,
  pickSoundFromGalleryVideo,
} from '@/features/sounds/services/soundImport';

export type SoundRecorderPhase = 'idle' | 'recording' | 'paused' | 'preview';
export type SoundInputMode = 'mic' | 'file' | 'video';

function formatTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
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
  const [previewProgress, setPreviewProgress] = useState(0);
  const [inputMode, setInputMode] = useState<SoundInputMode>('mic');
  const [importLabel, setImportLabel] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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
    setPreviewProgress(0);
  }, []);

  useEffect(() => () => {
    clearTimer();
    stopPreview();
  }, [clearTimer, stopPreview]);

  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  const syncElapsed = useCallback(() => {
    const base = pausedAccumRef.current;
    const segment = segmentStartRef.current ? (Date.now() - segmentStartRef.current) / 1000 : 0;
    const total = base + segment;
    setElapsedSec(total);
  }, []);

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
    setElapsedSec(pausedAccumRef.current);
  }, [clearTimer, recorder, recorderState.isRecording]);

  const resumeRecording = useCallback(() => {
    if (recorderState.isRecording) return;
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

    const duration = pausedAccumRef.current;
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
    setImportLabel(null);
    setPhase('idle');
  }, [clearTimer, phase, recorder, recorderState.isRecording, stopPreview]);

  const loadImportedAudio = useCallback(
    async (uri: string, durationSec: number, label?: string) => {
      stopPreview();
      clearTimer();
      if (recorderState.isRecording || phase === 'paused') {
        try {
          await recorder.stop();
        } catch {
          /* ignore */
        }
      }
      pausedAccumRef.current = 0;
      segmentStartRef.current = null;

      const duration = Math.max(MIN_SOUND_DURATION_SEC, durationSec);
      setRecordedUri(uri);
      setRecordedDurationSec(duration);
      setElapsedSec(duration);
      setImportLabel(label ?? null);
      setPhase('preview');
    },
    [clearTimer, phase, recorder, recorderState.isRecording, stopPreview],
  );

  const importFromFile = useCallback(async () => {
    setImporting(true);
    try {
      const result = await pickSoundFromFiles();
      if (!result.ok) {
        if (result.error !== 'cancelled') {
          Alert.alert('Dosya seçilemedi', result.error);
        }
        return;
      }
      await loadImportedAudio(result.uri, result.durationSec, result.label);
    } finally {
      setImporting(false);
    }
  }, [loadImportedAudio]);

  const importFromGalleryVideo = useCallback(async () => {
    setImporting(true);
    try {
      const result = await pickSoundFromGalleryVideo();
      if (!result.ok) {
        if (result.error !== 'cancelled') {
          Alert.alert('Video seçilemedi', result.error);
        }
        return;
      }
      await loadImportedAudio(result.uri, result.durationSec, result.label);
    } finally {
      setImporting(false);
    }
  }, [loadImportedAudio]);

  const switchInputMode = useCallback(
    async (mode: SoundInputMode) => {
      if (mode === inputMode) return;
      if (phase !== 'idle') {
        await cancelRecording();
      }
      setInputMode(mode);
    },
    [cancelRecording, inputMode, phase],
  );

  const togglePreview = useCallback(async () => {
    if (!recordedUri) return;

    if (previewPlaying) {
      stopPreview();
      return;
    }

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const duration = Math.max(0.1, recordedDurationSec);
    const player = createAudioPlayer({ uri: recordedUri });
    playerRef.current = player;
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) return;
      const position = status.currentTime ?? 0;
      setPreviewProgress(Math.min(1, position / duration));
      if (status.didJustFinish) {
        subscription.remove();
        stopPreview();
      }
    });
    player.play();
    setPreviewPlaying(true);
  }, [previewPlaying, recordedDurationSec, recordedUri, stopPreview]);

  const resetForRetake = useCallback(async () => {
    await cancelRecording();
  }, [cancelRecording]);

  return {
    phase,
    elapsedSec,
    elapsedLabel: formatTime(elapsedSec),
    maxSec: SOUND_RECORD_HINT_SEC,
    progress: Math.min(1, elapsedSec / SOUND_RECORD_HINT_SEC),
    recordedUri,
    recordedDurationSec,
    previewPlaying,
    previewProgress,
    inputMode,
    importLabel,
    importing,
    isRecording: recorderState.isRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    togglePreview,
    resetForRetake,
    switchInputMode,
    importFromFile,
    importFromGalleryVideo,
  };
}
