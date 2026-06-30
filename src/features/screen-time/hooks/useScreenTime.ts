import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SCREEN_TIME_TICK_MS } from '@/features/screen-time/constants';
import {
  checkGoalNotification,
  getScreenTimeSnapshot,
  subscribeScreenTime,
} from '@/features/screen-time/services/screenTimeTracker';
import type { ScreenTimeSnapshot } from '@/features/screen-time/types';

/**
 * Ekran süresi özetini canlı olarak döndürür.
 *
 * Performans: canlı sayaç (1 sn'lik tick) YALNIZCA bu hook'u kullanan ekran
 * açıkken ve uygulama ön plandayken çalışır; ekran kapanınca interval temizlenir.
 * Böylece arka planda veya başka ekranlarda hiçbir maliyet doğmaz.
 */
export function useScreenTime(): ScreenTimeSnapshot {
  const [snapshot, setSnapshot] = useState<ScreenTimeSnapshot>(() => getScreenTimeSnapshot());

  useEffect(() => {
    const refresh = () => {
      setSnapshot(getScreenTimeSnapshot());
      void checkGoalNotification();
    };

    refresh();
    const unsubscribe = subscribeScreenTime(refresh);

    let timer: ReturnType<typeof setInterval> | null = null;
    const startTicking = () => {
      if (timer != null) return;
      timer = setInterval(refresh, SCREEN_TIME_TICK_MS);
    };
    const stopTicking = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    if (AppState.currentState === 'active') startTicking();

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        startTicking();
      } else {
        stopTicking();
        refresh();
      }
    });

    return () => {
      stopTicking();
      appSub.remove();
      unsubscribe();
    };
  }, []);

  return snapshot;
}
