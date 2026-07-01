import { shouldRunUiWorkImmediately } from '@/lib/device/androidPerfProfile';

/**
 * Ağır arka plan işleri (carousel fetch, inbox yenileme).
 * Tablet: anında; Android telefon: çift rAF (setTimeout gecikmesi yok).
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
 * Tablet: sıfır gecikme — iş anında çalışır.
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
