import { listMissingFirebaseEnvKeys } from '@/config/env';

/** Android FCM için .env / app.config extra alanlarını doğrular. */
export function listMissingAndroidFcmEnvKeys(): string[] {
  return listMissingFirebaseEnvKeys();
}

export function androidFcmEnvConfigHint(missingKeys: string[]): string {
  return (
    `Firebase env boş veya eksik: ${missingKeys.join(', ')}.\n` +
    '.env dosyasına gerçek değerleri yaz (boş satır yetmez).\n' +
    'Firebase Console → Project settings → General → Project number = MESSAGING_SENDER_ID\n' +
    'Android app → google-services.json içinden API key, app id, project id alınabilir.'
  );
}
