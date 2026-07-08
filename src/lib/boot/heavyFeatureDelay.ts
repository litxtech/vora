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

/** Tablet: kısa aralıklarla sırayla — hepsi 0 olunca JS thread spike yapıyordu. */
const ANDROID_TABLET_DELAYS_MS: Record<HeavyFeatureBootKey, number> = {
  default: 300,
  'feature-flags': 0,
  appearance: 120,
  notifications: 450,
  'auth-profile': 220,
  calls: 650,
  vora: 850,
  proximity: 1_300,
};

/** Konum / çoklu realtime / tam profil — akış çizildikten sonra (ms). */
export function getHeavyFeatureBootDelayMs(key: HeavyFeatureBootKey = 'default'): number {
  if (Platform.OS === 'ios') return 800;
  if (Platform.OS !== 'android') return 0;
  if (isAndroidTablet()) return ANDROID_TABLET_DELAYS_MS[key];
  return ANDROID_PHONE_DELAYS_MS[key];
}
