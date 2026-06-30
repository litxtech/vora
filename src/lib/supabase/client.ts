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

export { isEnvConfigured };
