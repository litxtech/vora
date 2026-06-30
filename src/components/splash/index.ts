export { AppSplash } from './AppSplash';
export { BootSplash, BOOT_SPLASH_BACKGROUND } from './BootSplash';
export { SplashDots } from './SplashDots';

/** Boot animasyonu minimum süre — auth hazır olunca hemen geç. */
export const BOOT_SPLASH_MS = 0;

/** Splash görünmeden boot en fazla bu kadar bekler. */
export const BOOT_SPLASH_VISIBLE_TIMEOUT_MS = 120;

/** Cold start üst sınır — takılmayı önler. */
export const BOOT_FORCE_NAV_MS = 600;

/** Overlay kalkmadan önce hedef ekranın çizilmesi için üst sınır. */
export const BOOT_PAINT_TIMEOUT_MS = 80;
