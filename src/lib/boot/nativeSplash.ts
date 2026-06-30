import * as SplashScreen from 'expo-splash-screen';

let holdRequested = false;
let released = false;

/** Native splash JS hazır olana kadar açık kalsın (Android beyaz flaşı önler). */
export function holdNativeSplash(): void {
  if (holdRequested) return;
  holdRequested = true;
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

/** JS boot overlay çizildikten veya zaman aşımından sonra native splash kapat. */
export function releaseNativeSplash(): void {
  if (released) return;
  released = true;
  void SplashScreen.hideAsync().catch(() => undefined);
}
