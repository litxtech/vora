import { isAndroid } from '@/lib/device/androidPerfProfile';

/** Android: pull-to-refresh spinner gösterme — veri anında/arka planda güncellenir. */
export function shouldUseSilentListRefresh(): boolean {
  return isAndroid();
}

export function resolveListRefreshIndicatorVisible(refreshing: boolean): boolean {
  return shouldUseSilentListRefresh() ? false : refreshing;
}

export function shouldRefreshInBackground(hasExistingData: boolean): boolean {
  return shouldUseSilentListRefresh() || hasExistingData;
}

export function resolveSilentRefreshDebounceMs(defaultMs: number): number {
  // Android'de 0 ms debounce realtime fırtınasında sürekli yenilemeye yol açabiliyor.
  return shouldUseSilentListRefresh() ? Math.min(defaultMs, 400) : defaultMs;
}

export function resolveRealtimeRefreshDebounceMs(): number {
  return shouldUseSilentListRefresh() ? 500 : 1_200;
}
