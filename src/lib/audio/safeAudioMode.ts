import { Platform } from 'react-native';
import type { AudioMode } from 'expo-audio';

const AV_AUDIO_SESSION_INSUFFICIENT_PRIORITY = 561017449;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadSetAudioModeAsync() {
  const { setAudioModeAsync } = await import('expo-audio');
  return setAudioModeAsync;
}

function extractOsStatusCode(error: unknown): number | null {
  if (typeof error === 'object' && error != null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number') return code;
    if (typeof code === 'string') {
      const parsed = Number(code);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  const match = message.match(/561017449|0x21707269/i);
  return match ? AV_AUDIO_SESSION_INSUFFICIENT_PRIORITY : null;
}

function isAudioSessionPriorityError(error: unknown): boolean {
  return extractOsStatusCode(error) === AV_AUDIO_SESSION_INSUFFICIENT_PRIORITY;
}

type SafeAudioModeOptions = {
  retries?: number;
  delayMs?: number;
};

/** AVAudioSession öncelik çakışmalarında (kamera → önizleme) yeniden dener. */
export async function safeSetAudioModeAsync(
  mode: AudioMode,
  options?: SafeAudioModeOptions,
): Promise<boolean> {
  const retries = options?.retries ?? 3;
  const delayMs = options?.delayMs ?? 200;

  let setAudioModeAsync: Awaited<ReturnType<typeof loadSetAudioModeAsync>>;
  try {
    setAudioModeAsync = await loadSetAudioModeAsync();
  } catch (error) {
    if (__DEV__) {
      console.warn('[safeSetAudioModeAsync] expo-audio load failed', error);
    }
    return false;
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await setAudioModeAsync(mode);
      return true;
    } catch (error) {
      const canRetry = isAudioSessionPriorityError(error) && attempt < retries;
      if (!canRetry) {
        if (__DEV__) {
          console.warn('[safeSetAudioModeAsync] audio mode set failed', error);
        }
        return false;
      }
      await delay(delayMs * (attempt + 1));
    }
  }

  return false;
}

/** Video önizleme / oynatma için ses oturumu. */
export async function ensureVideoPlaybackAudioMode(): Promise<boolean> {
  return safeSetAudioModeAsync(
    {
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
    },
    { retries: 4, delayMs: 250 },
  );
}

/**
 * Kamera kaydı bittikten sonra mikrofon oturumunun bırakılması için kısa bekleme.
 * iOS'ta hemen ardından video önizlemesi açılırsa OSStatus 561017449 oluşabilir.
 */
export async function handoffCameraToVideoPlayback(): Promise<void> {
  if (Platform.OS === 'ios') {
    await delay(400);
  }
  await ensureVideoPlaybackAudioMode();
}
