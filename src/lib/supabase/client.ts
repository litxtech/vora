import { createClient } from '@supabase/supabase-js';
import { env, isEnvConfigured } from '@/config/env';
import type { Database } from '@/types/database';
import { supabaseAuthStorage } from './storage';

export const supabase = createClient<Database>(
  env.supabaseUrl || 'https://invalid.local',
  env.supabaseAnonKey || 'invalid-anon-key',
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
