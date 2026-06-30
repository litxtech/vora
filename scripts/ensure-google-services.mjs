/**
 * Android push (FCM) için google-services.json hazırlar.
 * - Dosya zaten varsa dokunmaz (Firebase Console indirmesi tercih edilir).
 * - Yoksa EXPO_PUBLIC_FIREBASE_* env ile üretir.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const outPath = path.join(root, 'google-services.json');
const packageName = 'com.karadeniz.dijitalagi';

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
const senderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();

if (fs.existsSync(outPath)) {
  console.log('[google-services] Mevcut dosya kullanılıyor:', outPath);
  process.exit(0);
}

const missing = [];
if (!apiKey) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
if (!projectId) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
if (!appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
if (!senderId) missing.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');

if (missing.length > 0) {
  console.warn(
    '[google-services] google-services.json yok.\n' +
      `  Eksik/boş env: ${missing.join(', ')}\n` +
      '  Seçenek A: Firebase Console → Android app → google-services.json indir → proje köküne koy\n' +
      '  Seçenek B: .env değerlerini doldur → npm run ensure:google-services\n' +
      '  Sonra: eas build --profile development --platform android',
  );
  process.exit(0);
}

const payload = {
  project_info: {
    project_number: senderId,
    project_id: projectId,
    storage_bucket: `${projectId}.firebasestorage.app`,
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: appId,
        android_client_info: {
          package_name: packageName,
        },
      },
      oauth_client: [],
      api_key: [{ current_key: apiKey }],
      services: {
        appinvite_service: {
          other_platform_oauth_client: [],
        },
      },
    },
  ],
  configuration_version: '1',
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log('[google-services] Oluşturuldu:', outPath);
console.log(
  '[google-services] Firebase Console\'da SHA-1 ekleyip yeni build alın: eas credentials → Android → Keystore SHA-1',
);
