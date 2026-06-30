import Constants from 'expo-constants';

const FIREBASE_ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
] as const;

function readExtra(key: string): string {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Android FCM için .env / app.config extra alanlarını doğrular. */
export function listMissingAndroidFcmEnvKeys(): string[] {
  return FIREBASE_ENV_KEYS.filter((key) => !readExtra(key));
}

export function androidFcmEnvConfigHint(missingKeys: string[]): string {
  return (
    `Firebase env boş veya eksik: ${missingKeys.join(', ')}.\n` +
    '.env dosyasına gerçek değerleri yaz (boş satır yetmez).\n' +
    'Firebase Console → Project settings → General → Project number = MESSAGING_SENDER_ID\n' +
    'Android app → google-services.json içinden API key, app id, project id alınabilir.'
  );
}
