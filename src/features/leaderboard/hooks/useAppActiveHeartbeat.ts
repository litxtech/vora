import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { trackAppActiveMinute } from '@/features/leaderboard/services/appActiveTime';
import { useAuth } from '@/providers/AuthProvider';

const HEARTBEAT_MS = 60_000;

/**
 * Uygulama ön plandayken dakikada bir aktif dakika sayacını günceller.
 * Liderlik tablosundaki "Ekran Süresi" sıralamasını besler.
 */
export function useAppActiveHeartbeat(): void {
  const { user, isGuest } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || isGuest) return;

    const tick = () => {
      if (AppState.currentState === 'active') {
        void trackAppActiveMinute();
      }
    };

    timerRef.current = setInterval(tick, HEARTBEAT_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, isGuest]);
}

export function AppActiveTracker() {
  useAppActiveHeartbeat();
  return null;
}
