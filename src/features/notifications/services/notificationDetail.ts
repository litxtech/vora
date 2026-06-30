import { supabase } from '@/lib/supabase/client';
import type { AppNotification } from '@/lib/notifications/types';
import type { NotificationEventType } from '@/constants/notifications';

const NOTIFICATION_SELECT =
  'id, event_type, category, priority, title, body, data, actor_id, read_at, opened_at, clicked_at, created_at';

export async function fetchNotificationById(id: string): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    eventType: row.event_type as NotificationEventType,
    category: (row.category as AppNotification['category']) ?? 'system',
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
