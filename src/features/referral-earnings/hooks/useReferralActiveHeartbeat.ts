import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { trackReferralEvent } from '@/features/referral-earnings/services/referralTracking';
import { useAuth } from '@/providers/AuthProvider';

const HEARTBEAT_MS = 60_000;

/** Davetli kullanıcının aktif dakika sayacını günceller. */
export function useReferralActiveHeartbeat(): void {
  const { user, isGuest } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || isGuest) return;

    const tick = () => {
      if (AppState.currentState === 'active') {
        void trackReferralEvent('active_minute');
      }
    };

    timerRef.current = setInterval(tick, HEARTBEAT_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, isGuest]);
}

export function ReferralActiveTracker() {
  useReferralActiveHeartbeat();
  return null;
}
