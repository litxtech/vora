import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { fetchFeatureVisibility } from '@/features/feature-flags/services/featureFlags';
import { isEffectivelyVisible } from '@/features/feature-flags/services/featureTree';
import type { FeatureId, FeatureVisibilityMap } from '@/features/feature-flags/types';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { useDebouncedAppActiveRefresh } from '@/lib/ui/useDebouncedAppActiveRefresh';
import { supabase } from '@/lib/supabase/client';

type FeatureFlagsContextValue = {
  isReady: boolean;
  visibility: FeatureVisibilityMap;
  isVisible: (featureId: FeatureId) => boolean;
  refresh: () => Promise<void>;
};

const FEATURE_FLAGS_FALLBACK: FeatureFlagsContextValue = {
  isReady: false,
  visibility: {},
  isVisible: () => true,
  refresh: async () => undefined,
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>(FEATURE_FLAGS_FALLBACK);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<FeatureVisibilityMap>({});
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const map = await fetchFeatureVisibility();
    setVisibility(map);
    setIsReady(true);
  }, []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const task = deferBackgroundWork(() => {
      void refresh();
    });
    return () => task.cancel();
  }, [refresh]);

  useDebouncedAppActiveRefresh(refresh);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;

    const disconnect = () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    const subscribe = () => {
      if (cancelled || AppState.currentState !== 'active') return;
      disconnect();
      channel = supabase
        .channel('app_feature_flags_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_feature_flags' },
          () => {
            void refreshRef.current();
          },
        )
        .subscribe();
    };

    const scheduleSubscribe = (delayMs: number) => {
      if (cancelled || AppState.currentState !== 'active') return;
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      if (delayMs > 0) {
        timer = setTimeout(subscribe, delayMs);
      } else {
        deferTask = deferBackgroundWork(subscribe);
      }
    };

    scheduleSubscribe(getHeavyFeatureBootDelayMs('feature-flags'));

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleSubscribe(0);
        return;
      }
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      disconnect();
    });

    return () => {
      cancelled = true;
      appSub.remove();
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      disconnect();
    };
  }, []);

  const isVisible = useCallback(
    (featureId: FeatureId) => {
      if (!featureId) return true;
      if (!isReady) return true;
      return isEffectivelyVisible(featureId, visibility);
    },
    [isReady, visibility],
  );

  const value = useMemo(
    () => ({ isReady, visibility, isVisible, refresh }),
    [isReady, visibility, isVisible, refresh],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  return useContext(FeatureFlagsContext);
}
