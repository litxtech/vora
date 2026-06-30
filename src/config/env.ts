import Constants from 'expo-constants';

type EnvKey =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_AGORA_APP_ID'
  | 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'
  | 'EXPO_PUBLIC_FIREBASE_API_KEY'
  | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
  | 'EXPO_PUBLIC_FIREBASE_APP_ID';

function getEnv(key: EnvKey): string {
  const value = process.env[key] ?? Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export const env = {
  supabaseUrl: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  agoraAppId: getEnv('EXPO_PUBLIC_AGORA_APP_ID'),
  mapboxToken: getEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'),
  firebase: {
    apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  },
} as const;

export function assertRequiredEnv(): void {
  if (!isEnvConfigured()) {
    throw new Error('Supabase URL ve anon key .env dosyasında tanımlanmalı.');
  }
}

export function isEnvConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
