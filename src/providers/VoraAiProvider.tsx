import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fetchVoraAiSettings } from '@/features/vora-ai/services/voraAiSettings';
import type { VoraAiModuleId } from '@/features/vora-ai/constants';
import type { VoraAiSettingsMap } from '@/features/vora-ai/types';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { useDebouncedAppActiveRefresh } from '@/lib/ui/useDebouncedAppActiveRefresh';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';

type VoraAiContextValue = {
  isReady: boolean;
  settings: VoraAiSettingsMap;
  isModuleEnabled: (module: VoraAiModuleId) => boolean;
  refresh: () => Promise<void>;
};

const FALLBACK: VoraAiContextValue = {
  isReady: false,
  settings: {} as VoraAiSettingsMap,
  isModuleEnabled: () => true,
  refresh: async () => undefined,
};

const VoraAiContext = createContext<VoraAiContextValue>(FALLBACK);

export function VoraAiProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VoraAiSettingsMap>({} as VoraAiSettingsMap);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    const map = await fetchVoraAiSettings();
    setSettings(map);
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
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;

    const disconnect = async () => {
      if (!channel) return;
      const stale = channel;
      channel = null;
      await supabase.removeChannel(stale);
    };

    const subscribe = () => {
      if (cancelled || AppState.currentState !== 'active') return;

      void (async () => {
        await disconnect();
        if (cancelled || AppState.currentState !== 'active') return;

        try {
          const next = await subscribeSupabaseChannel('ai_settings_changes', (ch) =>
            ch.on('postgres_changes', { event: '*', schema: 'public', table: 'ai_settings' }, () => {
              void refreshRef.current();
            }),
          );
          if (cancelled || AppState.currentState !== 'active') {
            await supabase.removeChannel(next);
            return;
          }
          channel = next;
        } catch {
          // Ayarlar canlı güncellemesi isteğe bağlı
        }
      })();
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

    scheduleSubscribe(getHeavyFeatureBootDelayMs('vora'));

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleSubscribe(0);
        return;
      }
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      void disconnect();
    });

    return () => {
      cancelled = true;
      appSub.remove();
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      void disconnect();
    };
  }, []);

  const isModuleEnabled = useCallback(
    (module: VoraAiModuleId) => {
      if (!isReady) return true;
      if (module !== 'master' && settings.master === false) return false;
      return settings[module] ?? true;
    },
    [isReady, settings],
  );

  const value = useMemo(
    () => ({ isReady, settings, isModuleEnabled, refresh }),
    [isReady, settings, isModuleEnabled, refresh],
  );

  return <VoraAiContext.Provider value={value}>{children}</VoraAiContext.Provider>;
}

export function useVoraAi() {
  return useContext(VoraAiContext);
}

export function useVoraAiModule(module: VoraAiModuleId): boolean {
  const { isModuleEnabled } = useVoraAi();
  return isModuleEnabled(module);
}
