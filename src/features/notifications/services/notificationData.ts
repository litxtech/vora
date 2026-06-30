import type { NotificationCategoryId } from '@/constants/notifications';
import { EVENT_CATEGORY_MAP, isInboxExcludedNotification } from '@/constants/notifications';
import type { NotificationEventType } from '@/constants/notifications';
import type { AppNotification, NotificationSoundSetting } from '@/lib/notifications/types';
import { supabase } from '@/lib/supabase/client';

const NOTIFICATION_SELECT =
  'id, event_type, category, priority, title, body, data, actor_id, read_at, opened_at, clicked_at, created_at';

function mapRow(row: Record<string, unknown>): AppNotification {
  const eventType = row.event_type as NotificationEventType;
  return {
    id: row.id as string,
    eventType,
    category: (row.category as NotificationCategoryId) ?? EVENT_CATEGORY_MAP[eventType] ?? 'system',
    priority: (row.priority as AppNotification['priority']) ?? 'normal',
    title: row.title as string,
    body: row.body as string,
    data: (row.data as Record<string, unknown>) ?? {},
    actorId: row.actor_id as string | null,
    readAt: row.read_at as string | null,
    openedAt: row.opened_at as string | null,
    clickedAt: row.clicked_at as string | null,
    createdAt: row.created_at as string,
  };
}

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

export async function fetchNotifications(
  userId: string,
  category: NotificationCategoryId = 'all',
  limit = 80,
): Promise<AppNotification[]> {
  let query = supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data } = await query;
  return (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((item) => !isInboxExcludedNotification(item.eventType, item.data));
}

export async function markNotificationRead(id: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('notifications')
    .update({ read_at: now, opened_at: now })
    .eq('id', id)
    .is('read_at', null);
}

export async function markNotificationClicked(id: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('notifications')
    .update({ clicked_at: now, read_at: now, opened_at: now })
    .eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('notifications')
    .update({ read_at: now, opened_at: now })
    .eq('user_id', userId)
    .is('read_at', null);
}

const DELETE_CHUNK_SIZE = 100;

async function deleteNotificationIds(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .in('id', chunk);

    if (error) throw error;
  }
}

export async function deleteNotifications(userId: string, ids: string[]): Promise<void> {
  await deleteNotificationIds(userId, ids);
}

async function fetchInboxNotificationIds(
  userId: string,
  category: NotificationCategoryId = 'all',
): Promise<string[]> {
  let query = supabase.from('notifications').select('id, event_type, data').eq('user_id', userId);

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter(
      (row) =>
        !isInboxExcludedNotification(
          row.event_type as NotificationEventType,
          row.data as Record<string, unknown>,
        ),
    )
    .map((row) => row.id as string);
}

export async function deleteAllInboxNotifications(
  userId: string,
  category: NotificationCategoryId = 'all',
): Promise<void> {
  const ids = await fetchInboxNotificationIds(userId, category);
  await deleteNotificationIds(userId, ids);
}

const CONVERSATION_NOTIFICATION_EVENTS = [
  'message',
  'group_message',
  'call_incoming',
  'call_video',
  'call_missed',
] as const satisfies readonly NotificationEventType[];

/** Sohbet açılınca yalnızca o konuşmaya ait bildirimleri okundu işaretle. */
export async function markConversationNotificationsRead(
  userId: string,
  conversationId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('notifications')
    .update({ read_at: now, opened_at: now })
    .eq('user_id', userId)
    .is('read_at', null)
    .in('event_type', [...CONVERSATION_NOTIFICATION_EVENTS])
    .filter('data->>conversation_id', 'eq', conversationId);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('notifications')
    .select('id, event_type, data')
    .eq('user_id', userId)
    .is('read_at', null);

  return (data ?? []).filter(
    (row) => !isInboxExcludedNotification(row.event_type as NotificationEventType, row.data as Record<string, unknown>),
  ).length;
}

export async function getUnreadCountByCategory(
  userId: string,
  category: NotificationCategoryId,
): Promise<number> {
  if (category === 'all') return getUnreadCount(userId);

  const { data } = await supabase
    .from('notifications')
    .select('id, event_type, data')
    .eq('user_id', userId)
    .eq('category', category)
    .is('read_at', null);

  return (data ?? []).filter(
    (row) => !isInboxExcludedNotification(row.event_type as NotificationEventType, row.data as Record<string, unknown>),
  ).length;
}
