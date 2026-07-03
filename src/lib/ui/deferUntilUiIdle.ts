import { shouldRunUiWorkImmediately } from '@/lib/device/androidPerfProfile';

/**
 * Ağır arka plan işleri (carousel fetch, inbox yenileme).
 * Çift rAF ile bir sonraki frame'de çalıştır — tablet dahil.
 */
export function deferBackgroundWork(task: () => void): { cancel: () => void } {
  if (shouldRunUiWorkImmediately()) {
    task();
    return { cancel: () => {} };
  }

  return deferUntilUiIdle(task);
}

/**
 * InteractionManager Android'de uzun süre "interaction active" kalabiliyor;
 * dokunma gecikmesine yol açar. Çift rAF ile bir sonraki frame'de çalıştır.
 */
export function deferUntilUiIdle(task: () => void): { cancel: () => void } {
  if (shouldRunUiWorkImmediately()) {
    task();
    return { cancel: () => {} };
  }

  let cancelled = false;
  let outerFrame = 0;
  let innerFrame = 0;

  outerFrame = requestAnimationFrame(() => {
    innerFrame = requestAnimationFrame(() => {
      if (!cancelled) task();
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    },
  };
}

/** @deprecated InteractionManager yerine — animasyon sonrası tek seferlik iş. */
export function deferAfterInteractions(task: () => void): { cancel: () => void } {
  return deferUntilUiIdle(task);
}
