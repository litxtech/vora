import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getAndroidHeavyFeatureBootDelayMs } from '@/lib/device/androidPerfProfile';
import { clearPresenceHeartbeat, setUserOffline, setUserOnline } from '../services/presence';

export function useUserPresence(userId: string | null | undefined) {
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) {
      clearPresenceHeartbeat();
      return;
    }

    const syncPresence = (state: AppStateStatus) => {
      const id = userIdRef.current;
      if (!id) return;

      if (state === 'active') {
        void setUserOnline(id);
      } else if (state === 'background') {
        void setUserOffline(id);
      }
    };

    if (AppState.currentState === 'active') {
      const delayMs = getAndroidHeavyFeatureBootDelayMs();
      if (delayMs > 0) {
        const timer = setTimeout(() => void setUserOnline(userId), delayMs);
        const sub = AppState.addEventListener('change', syncPresence);
        return () => {
          clearTimeout(timer);
          sub.remove();
          const id = userIdRef.current;
          if (id) void setUserOffline(id);
          else clearPresenceHeartbeat();
        };
      }
      void setUserOnline(userId);
    }

    const sub = AppState.addEventListener('change', syncPresence);

    return () => {
      sub.remove();
      const id = userIdRef.current;
      if (id) void setUserOffline(id);
      else clearPresenceHeartbeat();
    };
  }, [userId]);
}
