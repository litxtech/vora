import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { hasIosBadgePermission } from '@/lib/notifications/register';

export async function syncAppIconBadge(count: number): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'ios') {
    const settings = await Notifications.getPermissionsAsync();
    if (!hasIosBadgePermission(settings)) return;
  }

  try {
    await Notifications.setBadgeCountAsync(Math.max(0, Math.floor(count)));
  } catch {
    // İzin reddedildi veya desteklenmiyor
  }
}

export async function clearAppIconBadge(): Promise<void> {
  await syncAppIconBadge(0);
}
