import { useSegments } from 'expo-router';

/**
 * Yakınlık eşleşmesi GPS/poll yalnızca akış sekmesinde çalışsın —
 * harita, reels, mesaj vb. sekmelerde pil ve ısı yükünü azaltır.
 */
export function useProximityTrackingSurfaceActive(): boolean {
  const segments = useSegments();
  if (segments[0] !== '(tabs)') return false;
  const tab = segments[1];
  return !tab || tab === 'index';
}
