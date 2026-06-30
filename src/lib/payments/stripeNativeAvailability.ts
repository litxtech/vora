import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

let cachedAvailability: boolean | null = null;

/** Dev client yeniden build edilmediyse @stripe/stripe-react-native native modülü bulunmaz. */
export function isStripeNativeAvailable(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (cachedAvailability !== null) return cachedAvailability;

  try {
    cachedAvailability = requireOptionalNativeModule('StripeSdk') != null;
  } catch {
    cachedAvailability = false;
  }

  return cachedAvailability;
}

export const STRIPE_REBUILD_HINT =
  'Stripe ödemeleri için dev client yeniden derlenmeli: npx expo run:ios veya npx expo run:android';
