import { useEffect } from 'react';
import { usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

/** Native splash RN içeriğinin üstünde kalırsa siyah perde gibi görünür — agresif kapat. */
export function SplashHider() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, [pathname, segments]);

  useEffect(() => {
    const timers = [0, 400, 1200, 2500].map((ms) =>
      setTimeout(() => {
        void SplashScreen.hideAsync();
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
