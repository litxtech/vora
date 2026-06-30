import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';

/** expo-screen-orientation OrientationLock.PORTRAIT_UP */
const ORIENTATION_LOCK_PORTRAIT_UP = 3;

type ScreenOrientationNative = {
  lockAsync: (lock: number) => Promise<void>;
  unlockAsync?: () => Promise<void>;
};

const native = requireOptionalNativeModule<ScreenOrientationNative>('ExpoScreenOrientation');

/** Telefon: dikey kilit; Android tablet: cihaz döndürmesine izin ver. */
export function ScreenOrientationBootstrap() {
  useEffect(() => {
    if (!native?.lockAsync) return;

    const run = () => {
      void (async () => {
        try {
          if (Platform.OS === 'android' && isAndroidTablet()) {
            await native.unlockAsync?.();
            return;
          }
          await native.lockAsync(ORIENTATION_LOCK_PORTRAIT_UP);
        } catch {
          // Dev client rebuild edilmediyse app.config orientation yeterli.
        }
      })();
    };

    run();
  }, []);

  return null;
}
