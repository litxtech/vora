import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { isAndroid } from '@/lib/device/androidPerfProfile';

/**
 * Android: çok kısa fade — `none` önceki sayfanın donuk silüetini bırakıyordu;
 * 140ms+ fade geçişi ağır hissettiriyordu.
 * iOS: varsayılan slide / verilen fallback.
 */
export function resolveStackAnimation(
  fallback: NativeStackNavigationOptions['animation'] = 'slide_from_right',
): NativeStackNavigationOptions['animation'] {
  return isAndroid() ? 'fade' : fallback;
}

export function getDefaultStackScreenOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    animation: resolveStackAnimation(),
    ...(isAndroid()
      ? {
          animationDuration: 55,
          freezeOnBlur: false,
          detachInactiveScreens: true,
        }
      : {
          freezeOnBlur: true,
        }),
    ...overrides,
  };
}
