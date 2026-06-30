import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions } from '@/lib/notifications/register';
import { formatDuration } from '@/features/screen-time/utils';

/**
 * Günlük ekran süresi hedefi aşıldığında YEREL bildirim gönderir.
 * Tamamen cihaz içinde çalışır — sunucu / push / ağ kullanılmaz.
 */
export async function notifyScreenTimeGoalReached(goalMinutes: number): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Günlük ekran süresi hedefi',
      body: `Bugün uygulamada ${formatDuration(goalMinutes * 60)} sınırına ulaştın. Biraz ara vermek ister misin?`,
      data: { eventType: 'screen_time_goal' },
    },
    trigger: null,
  });
}

/** Kullanıcı hedef belirlerken bildirim izni iste (yoksa). */
export async function ensureGoalNotificationPermission(): Promise<boolean> {
  try {
    return await requestNotificationPermissions();
  } catch {
    return false;
  }
}
