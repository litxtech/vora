import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_APP_APPEARANCE } from '@/features/app-appearance/constants';
import { fetchAppAppearanceConfig } from '@/features/app-appearance/services/appAppearance';
import type { AppAppearanceConfig } from '@/features/app-appearance/types';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { useDebouncedAppActiveRefresh } from '@/lib/ui/useDebouncedAppActiveRefresh';
import { supabase } from '@/lib/supabase/client';
import { AppearanceContext } from '@/providers/appearanceContext';

export { useAppearance, useAppearanceOptional } from '@/providers/appearanceContext';
export type { AppearanceContextValue } from '@/providers/appearanceContext';

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppAppearanceConfig>(DEFAULT_APP_APPEARANCE);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchAppAppearanceConfig();
    setConfig(next);
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
        .channel('app_appearance_config_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_system_config',
            filter: 'key=eq.app_appearance',
          },
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

    scheduleSubscribe(getHeavyFeatureBootDelayMs('appearance'));

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

  const value = useMemo(() => ({ isReady, config, refresh }), [isReady, config, refresh]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
