import { Platform } from 'react-native';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

/** Ağır özellik başlatma sırası — Android'de aynı anda spike olmasın. */
export type HeavyFeatureBootKey =
  | 'default'
  | 'feature-flags'
  | 'appearance'
  | 'notifications'
  | 'auth-profile'
  | 'calls'
  | 'vora'
  | 'proximity';

const ANDROID_PHONE_DELAYS_MS: Record<HeavyFeatureBootKey, number> = {
  default: 900,
  'feature-flags': 450,
  appearance: 500,
  notifications: 650,
  'auth-profile': 750,
  calls: 850,
  vora: 950,
  proximity: 1_100,
};

const ANDROID_TABLET_DELAYS_MS: Record<HeavyFeatureBootKey, number> = {
  default: 150,
  'feature-flags': 80,
  appearance: 100,
  notifications: 120,
  'auth-profile': 140,
  calls: 180,
  vora: 220,
  proximity: 280,
};

/** Konum / çoklu realtime / tam profil — akış çizildikten sonra (ms). */
export function getHeavyFeatureBootDelayMs(key: HeavyFeatureBootKey = 'default'): number {
  if (Platform.OS === 'ios') return 800;
  if (Platform.OS !== 'android') return 0;
  const table = isAndroidTablet() ? ANDROID_TABLET_DELAYS_MS : ANDROID_PHONE_DELAYS_MS;
  return table[key];
}
