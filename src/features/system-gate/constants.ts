import { ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL } from '@/lib/sharing/constants';
import type { MaintenanceModeConfig, MinAppVersionConfig } from '@/features/system-gate/types';

export const DEFAULT_MIN_APP_VERSION: MinAppVersionConfig = {
  enabled: false,
  ios: '1.0.0',
  android: '1.0.0',
  title: 'Güncelleme gerekli',
  message: "Vora'nın yeni sürümünü kullanmak için lütfen uygulamayı güncelleyin.",
  changelog: '',
  admin_note: '',
  ios_store_url: '',
  android_store_url: '',
};

export const DEFAULT_MAINTENANCE_MODE: MaintenanceModeConfig = {
  enabled: false,
  title: 'Bakım çalışması',
  message: 'Kısa süre sonra tekrar deneyin.',
  admin_note: '',
  estimated_end: null,
};

export const DEFAULT_IOS_STORE_URL = IOS_APP_STORE_URL;
export const DEFAULT_ANDROID_STORE_URL = ANDROID_PLAY_STORE_URL;
