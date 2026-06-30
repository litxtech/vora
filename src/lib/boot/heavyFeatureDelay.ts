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
  default: 2_200,
  'feature-flags': 1_400,
  appearance: 1_550,
  notifications: 1_900,
  'auth-profile': 2_250,
  calls: 2_600,
  vora: 2_900,
  proximity: 3_300,
};

const ANDROID_TABLET_DELAYS_MS: Record<HeavyFeatureBootKey, number> = {
  default: 800,
  'feature-flags': 500,
  appearance: 550,
  notifications: 650,
  'auth-profile': 750,
  calls: 850,
  vora: 950,
  proximity: 1_100,
};

/** Konum / çoklu realtime / tam profil — akış çizildikten sonra (ms). */
export function getHeavyFeatureBootDelayMs(key: HeavyFeatureBootKey = 'default'): number {
  if (Platform.OS === 'ios') return 800;
  if (Platform.OS !== 'android') return 0;
  const table = isAndroidTablet() ? ANDROID_TABLET_DELAYS_MS : ANDROID_PHONE_DELAYS_MS;
  return table[key];
}
