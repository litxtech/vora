import Constants from 'expo-constants';

/**
 * İstemci ortam değişkenleri — `.env` / `app.config` extra.
 * Kod içinde doğrudan `process.env` yerine `env` nesnesini kullanın.
 * Tam liste: docs/ENVIRONMENT.md
 */
export type PublicEnvKey =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_AGORA_APP_ID'
  | 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'
  | 'EXPO_PUBLIC_FIREBASE_API_KEY'
  | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
  | 'EXPO_PUBLIC_FIREBASE_APP_ID'
  | 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  | 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  | 'EXPO_PUBLIC_SHARE_BASE_URL'
  | 'EXPO_PUBLIC_IOS_APP_STORE_URL'
  | 'EXPO_PUBLIC_ANDROID_PLAY_STORE_URL'
  | 'EXPO_PUBLIC_TERMS_OF_USE_URL'
  | 'EXPO_PUBLIC_PRIVACY_POLICY_URL'
  | 'EXPO_PUBLIC_CHILD_PROTECTION_POLICY_URL'
  | 'EXPO_PUBLIC_ENABLE_DEMO_DATA';

export function getPublicEnv(key: PublicEnvKey): string {
  const value = process.env[key] ?? Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function optionalUrl(key: PublicEnvKey): string | undefined {
  const value = getPublicEnv(key);
  return value || undefined;
}

function resolveDemoDataEnabled(): boolean {
  const flag = getPublicEnv('EXPO_PUBLIC_ENABLE_DEMO_DATA');
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return __DEV__;
}

export const env = {
  supabase: {
    url: getPublicEnv('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: getPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
  agora: {
    appId: getPublicEnv('EXPO_PUBLIC_AGORA_APP_ID'),
  },
  mapbox: {
    accessToken: getPublicEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'),
  },
  firebase: {
    apiKey: getPublicEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    projectId: getPublicEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    appId: getPublicEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
    messagingSenderId: getPublicEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  },
  stripe: {
    publishableKey: getPublicEnv('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  },
  share: {
    baseUrl: getPublicEnv('EXPO_PUBLIC_SHARE_BASE_URL'),
  },
  stores: {
    iosAppStoreUrl: getPublicEnv('EXPO_PUBLIC_IOS_APP_STORE_URL'),
    androidPlayStoreUrl: getPublicEnv('EXPO_PUBLIC_ANDROID_PLAY_STORE_URL'),
  },
  legal: {
    termsOfUseUrl: optionalUrl('EXPO_PUBLIC_TERMS_OF_USE_URL'),
    privacyPolicyUrl: optionalUrl('EXPO_PUBLIC_PRIVACY_POLICY_URL'),
    childProtectionPolicyUrl: optionalUrl('EXPO_PUBLIC_CHILD_PROTECTION_POLICY_URL'),
  },
  dev: {
    isDemoDataEnabled: resolveDemoDataEnabled(),
  },
} as const;

/** Android FCM doğrulaması için gerekli public anahtarlar. */
export const FIREBASE_PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
] as const satisfies readonly PublicEnvKey[];

export function listMissingFirebaseEnvKeys(): string[] {
  return FIREBASE_PUBLIC_ENV_KEYS.filter((key) => !getPublicEnv(key));
}

export function isEnvConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.anonKey);
}

export function assertRequiredEnv(): void {
  if (!isEnvConfigured()) {
    throw new Error('Supabase URL ve anon key .env dosyasında tanımlanmalı.');
  }
}
