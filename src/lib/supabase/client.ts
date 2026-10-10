import { AppState, Platform, type AppStateStatus } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { env, isEnvConfigured } from '@/config/env';
import type { Database } from '@/types/database';
import { supabaseAuthStorage } from './storage';

export const supabase = createClient<Database>(
  env.supabase.url || 'https://invalid.local',
  env.supabase.anonKey || 'invalid-anon-key',
  {
    auth: {
      storage: supabaseAuthStorage,
      storageKey: 'vora.auth.session',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * iOS, uygulama arka plandayken SecureStore okumasına izin vermez.
 * GoTrue yenileme tikini sürekli çalıştırdığı için bu "User interaction is not allowed" hatasını basar.
 * Yenileme yalnızca uygulama öndeyken çalışır.
 */
const authRefreshGuard = globalThis as { __voraAuthRefreshBound?: boolean };
if (Platform.OS !== 'web' && !authRefreshGuard.__voraAuthRefreshBound) {
  authRefreshGuard.__voraAuthRefreshBound = true;
  const syncAuthRefresh = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  syncAuthRefresh(AppState.currentState);
  AppState.addEventListener('change', syncAuthRefresh);
}

export { isEnvConfigured };
