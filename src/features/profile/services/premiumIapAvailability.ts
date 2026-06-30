import { Platform } from 'react-native';

let cachedAvailability: boolean | null = null;

/** Dev client yeniden build edilmediyse expo-iap native modülü bulunmaz. */
export function isExpoIapNativeAvailable(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (cachedAvailability !== null) return cachedAvailability;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => unknown;
    };
    requireNativeModule('ExpoIap');
    cachedAvailability = true;
  } catch {
    cachedAvailability = false;
  }

  return cachedAvailability;
}

/** Premium abonelik yalnızca mağaza IAP ile satılır (iOS App Store / Google Play). */
export function usesNativeStoreBilling(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
