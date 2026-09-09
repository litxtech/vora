import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { router, usePathname, type Href } from 'expo-router';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { hasActiveCallSession } from '@/features/calls/services/callNavigation';
import { useCallStore } from '@/features/calls/store/callStore';
import {
  SHAKE_COOLDOWN_MS,
  SHAKE_MIN_SPIKES,
  SHAKE_SAMPLE_INTERVAL_MS,
  SHAKE_THRESHOLD,
  SHAKE_WINDOW_MS,
} from '@/features/compose/constants/shakeToCompose';
import { useShakeToComposeSurfaceActive } from '@/features/compose/hooks/useShakeToComposeSurfaceActive';
import { useShakeToComposeStore } from '@/features/compose/store/shakeToComposeStore';

const BLOCKED_ROUTES = ['/compose', '/capture', '/media-editor', '/call/', '/stories'];

function isBlockedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return BLOCKED_ROUTES.some((route) => pathname.startsWith(route));
}

export function useShakeToCompose() {
  const enabled = useShakeToComposeStore((s) => s.enabled);
  const hydrated = useShakeToComposeStore((s) => s.hydrated);
  const hydrate = useShakeToComposeStore((s) => s.hydrate);
  const surfaceActive = useShakeToComposeSurfaceActive();
  const pathname = usePathname();
  const showCompose = useFeatureVisible('compose');
  const { requireAuth } = useRequireAuth();
  const callSession = useCallStore((s) => s.session);
  const callJoined = useCallStore((s) => s.isJoined);
  const inCall = hasActiveCallSession(callSession, callJoined);

  const lastShakeAt = useRef(0);
  const spikeCount = useRef(0);
  const windowStart = useRef(0);
  const triggering = useRef(false);

  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      setAppActive(state === 'active');
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  const listening =
    hydrated &&
    enabled &&
    showCompose &&
    surfaceActive &&
    appActive &&
    !inCall &&
    !isBlockedRoute(pathname);

  useEffect(() => {
    if (!listening) return;

    Accelerometer.setUpdateInterval(SHAKE_SAMPLE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const deviation = Math.abs(magnitude - 1);

      if (deviation < SHAKE_THRESHOLD) {
        if (now - windowStart.current > SHAKE_WINDOW_MS) {
          spikeCount.current = 0;
        }
        return;
      }

      if (now - windowStart.current > SHAKE_WINDOW_MS) {
        windowStart.current = now;
        spikeCount.current = 0;
      }

      spikeCount.current += 1;

      if (
        spikeCount.current < SHAKE_MIN_SPIKES ||
        now - lastShakeAt.current < SHAKE_COOLDOWN_MS ||
        triggering.current
      ) {
        return;
      }

      lastShakeAt.current = now;
      spikeCount.current = 0;
      triggering.current = true;

      void (async () => {
        try {
          if (!(await requireAuth('Paylaşım'))) return;
          if (Platform.OS !== 'android') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.push('/compose' as Href);
        } finally {
          triggering.current = false;
        }
      })();
    });

    return () => subscription.remove();
  }, [listening, requireAuth]);
}
