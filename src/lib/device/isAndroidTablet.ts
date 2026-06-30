import { Dimensions, Platform } from 'react-native';

/** Android tablet eşiği — 600dp (Google smallest-width guideline). */
const ANDROID_TABLET_MIN_DP = 600;

export function isAndroidTablet(): boolean {
  if (Platform.OS !== 'android') return false;
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) >= ANDROID_TABLET_MIN_DP;
}

export function isAndroidPhone(): boolean {
  return Platform.OS === 'android' && !isAndroidTablet();
}
