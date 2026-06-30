import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { isAndroid } from '@/lib/device/androidPerfProfile';

/** Android: iOS benzeri anında geçiş — animasyon yok. */
export function resolveStackAnimation(
  fallback: NativeStackNavigationOptions['animation'] = 'slide_from_right',
): NativeStackNavigationOptions['animation'] {
  return isAndroid() ? 'none' : fallback;
}

export function getDefaultStackScreenOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    animation: resolveStackAnimation(),
    ...(isAndroid()
      ? {
          animationDuration: 0,
          freezeOnBlur: false,
          detachInactiveScreens: true,
        }
      : {}),
    ...overrides,
  };
}
