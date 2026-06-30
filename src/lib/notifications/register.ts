import { APP_BUNDLE_ID } from '@/constants/app';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCurrentAppVersion } from '@/features/system-gate/services/appVersion';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase/client';
import { devWarn } from '@/lib/safeLog';

const DEVICE_ID_KEY = 'push.device_id';

let registerPushTokensInFlight: Promise<void> | null = null;
let registerPushTokensUserId: string | null = null;
let lastAndroidPushFailAt = 0;

/** FCM yapılandırılmamışsa her ön plana dönüşte token denemesini sınırla. */
const ANDROID_PUSH_FAIL_COOLDOWN_MS = 15 * 60 * 1000;

export type IosPushPermissionIssue =
  | 'expo_go'
  | 'denied'
  | 'provisional'
  | 'alerts_off'
  | null;

export function getIosPushPermissionIssue(
  settings: Notifications.NotificationPermissionsStatus,
): IosPushPermissionIssue {
  if (Platform.OS !== 'ios') return null;
  if (Constants.appOwnership === 'expo') return 'expo_go';

  const ios = settings.ios;
  if (!ios) return settings.status === 'denied' ? 'denied' : null;

  if (
    ios.status === Notifications.IosAuthorizationStatus.DENIED ||
    settings.status === 'denied'
  ) {
    return 'denied';
  }

  if (ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'provisional';
  }

  if (ios.allowsAlert === false) {
    return 'alerts_off';
  }

  return null;
}

export function iosPushPermissionHint(issue: IosPushPermissionIssue): string | null {
  switch (issue) {
    case 'expo_go':
      return 'Expo Go ile arka plan push çalışmaz. TestFlight veya App Store build kullanın.';
    case 'denied':
      return 'Bildirim izni kapalı. Ayarlar → Vora → Bildirimler → İzin Ver.';
    case 'provisional':
      return 'Sessiz (provisional) izin var — üstten banner gelmez. Ayarlardan "Bildirimler" → "Anında Teslim Et" seçin.';
    case 'alerts_off':
      return 'Bildirimler açık ama "Bannner/Bildirimler" kapalı. iOS Ayarlar → Vora → Bildirimler → Bildirimleri İzin Ver.';
    default:
      return null;
  }
}

export function androidPushRegistrationHint(): string {
  return (
    'Android push token alınamadı (FCM). google-services.json + yeni native build gerekir:\n' +
    `1) Firebase Console → Android app (${APP_BUNDLE_ID}) → google-services.json indir\n` +
    '2) Proje köküne koy VEYA .env\'e EXPO_PUBLIC_FIREBASE_* değerlerini yaz (npm run ensure:google-services)\n' +
    '3) Firebase\'e EAS SHA-1 ekle: eas credentials -p android\n' +
    '4) Yeniden build: eas build --profile development --platform android'
  );
}

async function createStableDeviceId(): Promise<string> {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Platform.OS}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function getDeviceId(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) return stored;
  } catch {
    // SecureStore kullanılamıyorsa oturum kimliğine düş
  }

  const fallback = Constants.sessionId ?? (await createStableDeviceId());

  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, fallback);
  } catch {
    // Kaydedilemezse yine de fallback ile devam et
  }

  return fallback;
}

function isIosNotificationGranted(settings: Notifications.NotificationPermissionsStatus): boolean {
  const ios = settings.ios;
  if (!ios) return settings.status === 'granted';

  const authorized =
    ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  return authorized && ios.allowsAlert !== false;
}

/** iOS push token kaydı için yeterli izin (provisional dahil). */
function isIosPushTokenEligible(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS !== 'ios') return settings.status === 'granted';

  const ios = settings.ios;
  if (!ios) return settings.status === 'granted';

  return (
    ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export function hasIosBadgePermission(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS !== 'ios') return true;

  const ios = settings.ios;
  if (!ios) return settings.status === 'granted';

  const authorized =
    ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  return authorized && ios.allowsBadge !== false;
}

export function hasIosSoundPermission(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS !== 'ios') return true;

  const ios = settings.ios;
  if (!ios) return settings.status === 'granted';

  const authorized =
    ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  return authorized && ios.allowsSound !== false;
}

export function hasNotificationPermission(
  settings: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS === 'ios') return isIosNotificationGranted(settings);
  return settings.status === 'granted';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (hasNotificationPermission(existing)) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: true,
    },
  });

  return hasNotificationPermission(requested);
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Ayarlar açılamazsa sessizce geç
  }
}

function resolveExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

async function fetchPushCredentials(projectId: string | undefined): Promise<{
  expoPushToken: string | null;
  devicePushToken: string | null;
}> {
  let expoPushToken: string | null = null;
  let devicePushToken: string | null = null;

  if (projectId) {
    try {
      const expo = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = expo.data;
    } catch (err) {
      devWarn('push', 'Expo push token alınamadı', {
        platform: Platform.OS,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    devWarn('push', 'EAS projectId eksik — push token kaydı atlandı');
  }

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    devicePushToken = typeof device.data === 'string' ? device.data : null;
  } catch (err) {
    devWarn('push', 'Device push token alınamadı', {
      platform: Platform.OS,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { expoPushToken, devicePushToken };
}

export async function registerPushTokens(userId: string): Promise<void> {
  if (registerPushTokensInFlight && registerPushTokensUserId === userId) {
    return registerPushTokensInFlight;
  }

  registerPushTokensUserId = userId;
  registerPushTokensInFlight = registerPushTokensOnce(userId).finally(() => {
    registerPushTokensInFlight = null;
    registerPushTokensUserId = null;
  });

  return registerPushTokensInFlight;
}

async function registerPushTokensOnce(userId: string): Promise<void> {
  if (
    Platform.OS === 'android' &&
    lastAndroidPushFailAt > 0 &&
    Date.now() - lastAndroidPushFailAt < ANDROID_PUSH_FAIL_COOLDOWN_MS
  ) {
    return;
  }

  if (Platform.OS === 'android') {
    const { ensureAndroidChannels } = await import('@/lib/notifications/channels');
    await ensureAndroidChannels();
  }

  const permissions = await Notifications.getPermissionsAsync();
  const canRegister =
    Platform.OS === 'ios'
      ? isIosPushTokenEligible(permissions)
      : permissions.status === 'granted';

  if (!canRegister) {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
  }

  const projectId = resolveExpoProjectId();
  const { expoPushToken, devicePushToken } = await fetchPushCredentials(projectId);

  if (!expoPushToken && !devicePushToken) {
    if (Platform.OS === 'android') {
      lastAndroidPushFailAt = Date.now();
    }
    if (Platform.OS === 'ios') {
      const issue = getIosPushPermissionIssue(await Notifications.getPermissionsAsync());
      devWarn('push', 'iOS push token kaydı başarısız', { issue });
    }
    return;
  }

  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const deviceId = await getDeviceId();

  const { error } = await supabase.rpc('register_push_token', {
    p_user_id: userId,
    p_platform: platform,
    p_device_id: deviceId,
    p_expo_push_token: expoPushToken,
    p_device_push_token: devicePushToken,
    p_app_version: getCurrentAppVersion(),
    p_app_build:
      Constants.nativeBuildVersion ??
      (Platform.OS === 'android'
        ? Constants.expoConfig?.android?.versionCode?.toString()
        : Constants.expoConfig?.ios?.buildNumber) ??
      null,
  });

  if (error) devWarn('push', 'Token kaydı başarısız', error.message);
  else lastAndroidPushFailAt = 0;
}

export async function deactivatePushTokens(userId: string): Promise<void> {
  const deviceId = await getDeviceId();
  await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', deviceId);
}

/** APNs/FCM token yenilenince sunucuya tekrar kaydet. */
export function subscribePushTokenRefresh(userId: string): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerPushTokens(userId).catch(() => undefined);
  });
  return () => subscription.remove();
}
