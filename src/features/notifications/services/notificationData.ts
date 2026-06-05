import type { NotificationEventType } from '@/constants/notifications';
import type { AppNotification, NotificationSoundSetting } from '@/lib/notifications/types';
import { supabase } from '@/lib/supabase/client';

export async function fetchSoundSettings(): Promise<NotificationSoundSetting[]> {
  const { data } = await supabase
    .from('notification_sound_settings')
    .select('*')
    .order('label');

  return (data ?? []).map((row) => ({
    eventType: row.event_type as NotificationEventType,
    label: row.label,
    soundStoragePath: row.sound_storage_path,
    soundFilename: row.sound_filename,
    soundUrl: row.sound_url,
    durationSeconds: row.duration_seconds,
    isCustomEnabled: row.is_custom_enabled,
  }));
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('id, event_type, title, body, data, actor_id, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type as NotificationEventType,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    actorId: row.actor_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  return count ?? 0;
}
