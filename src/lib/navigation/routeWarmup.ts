import { Platform } from 'react-native';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { HEAVY_ROUTE_WARMUP_LOADERS } from '@/lib/navigation/heavyRouteWarmupLoaders';

let warmed = false;

function getWarmupStartDelayMs(): number {
  // Android: daha erken ısıt — detay/sohbet açılışı soğuk chunk beklemesin.
  if (isAndroidTablet()) return getHeavyFeatureBootDelayMs('default') + 280;
  if (Platform.OS === 'android') return Math.max(100, getHeavyFeatureBootDelayMs('default') + 80);
  return getHeavyFeatureBootDelayMs('default') + 400;
}

function getWarmupStaggerMs(): number {
  if (isAndroidTablet()) return 240;
  if (Platform.OS === 'android') return 110;
  return 180;
}

function prefetchLoader(loader: () => Promise<unknown> | unknown): Promise<void> {
  try {
    return Promise.resolve(loader()).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    return Promise.resolve();
  }
}

/**
 * Ağır stack ekran modüllerini akış etkileşilebilir olduktan sonra sırayla yükler.
 * İlk detay/sohbet geçişi daha hızlı hissedilir.
 */
export function warmupHeavyRouteModules(): { cancel: () => void } {
  // Dev client: her prefetch Metro'da binlerce modül derler — telefon donuyor.
  if (__DEV__ || warmed) {
    return { cancel: () => {} };
  }

  let cancelled = false;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let staggerTimer: ReturnType<typeof setTimeout> | null = null;

  const deferTask = deferBackgroundWork(() => {
    if (cancelled) return;

    startTimer = setTimeout(() => {
      if (cancelled) return;
      warmed = true;

      let index = 0;
      const loadNext = () => {
        if (cancelled || index >= HEAVY_ROUTE_WARMUP_LOADERS.length) return;
        const loader = HEAVY_ROUTE_WARMUP_LOADERS[index];
        index += 1;
        if (typeof loader !== 'function') {
          staggerTimer = setTimeout(loadNext, getWarmupStaggerMs());
          return;
        }
        void prefetchLoader(loader).finally(() => {
          if (cancelled) return;
          staggerTimer = setTimeout(loadNext, getWarmupStaggerMs());
        });
      };

      loadNext();
    }, getWarmupStartDelayMs());
  });

  return {
    cancel: () => {
      cancelled = true;
      deferTask.cancel();
      if (startTimer) clearTimeout(startTimer);
      if (staggerTimer) clearTimeout(staggerTimer);
    },
  };
}
