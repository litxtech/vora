import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getDeviceId(): string {
  return Constants.sessionId ?? `device-${Platform.OS}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function registerPushTokens(userId: string): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  let expoPushToken: string | null = null;
  let devicePushToken: string | null = null;

  try {
    if (projectId) {
      const expo = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = expo.data;
    }
  } catch {
    // Expo Go veya EAS projectId eksik
  }

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    devicePushToken = device.data;
  } catch {
    // Simülatör
  }

  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const deviceId = getDeviceId();

  const { data: existing } = await supabase
    .from('push_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    platform,
    expo_push_token: expoPushToken,
    device_push_token: devicePushToken,
    device_id: deviceId,
    is_active: true,
  };

  if (existing?.id) {
    await supabase
      .from('push_tokens')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('push_tokens').insert(payload);
  }
}

export async function deactivatePushTokens(userId: string): Promise<void> {
  const deviceId = getDeviceId();
  await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('device_id', deviceId);
}
