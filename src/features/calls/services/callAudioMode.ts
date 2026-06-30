import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

/** Aktif görüşme — arka planda ses devam etsin. */
export async function activateCallAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: true,
  });
}

export async function deactivateCallAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
}
