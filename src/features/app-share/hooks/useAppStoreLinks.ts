import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchAppStoreLinksConfig } from '@/features/app-share/services/appStoreLinks';
import { parseAppStoreLinksConfig } from '@/features/app-share/utils/parseAppStoreLinksConfig';
import type { AppStoreLinksConfig } from '@/features/app-share/types';
import { DEFAULT_APP_STORE_LINKS } from '@/features/app-share/constants';
import { supabase } from '@/lib/supabase/client';

export function useAppStoreLinks() {
  const [config, setConfig] = useState<AppStoreLinksConfig>(DEFAULT_APP_STORE_LINKS);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    const next = await fetchAppStoreLinksConfig();
    setConfig(next);
    setLoading(false);
  }, []);

  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel('app_store_links_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_system_config',
          filter: 'key=eq.app_store_links',
        },
        () => {
          void refreshRef.current();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshRef.current();
    });
    return () => sub.remove();
  }, []);

  return {
    config,
    loading,
    refresh,
    hasIosLink: Boolean(config.ios_url),
    hasAndroidLink: Boolean(config.android_url),
  };
}

export function useParsedAppStoreLinks(raw: unknown): AppStoreLinksConfig {
  return parseAppStoreLinksConfig(raw);
}
