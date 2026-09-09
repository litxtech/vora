import { useSegments } from 'expo-router';

const BLOCKED_TABS = new Set(['reels', 'map', 'create', 'admin']);

/**
 * Sallama kısayolu yalnızca ana sekmelerde — reels, harita ve kamera akışında devre dışı.
 */
export function useShakeToComposeSurfaceActive(): boolean {
  const segments = useSegments();
  if (segments[0] !== '(tabs)') return false;

  const tab = segments[1];
  if (!tab || tab === 'index') return true;
  if (BLOCKED_TABS.has(tab)) return false;

  return true;
}
