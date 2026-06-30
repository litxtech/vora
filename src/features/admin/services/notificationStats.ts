import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type NotificationStats = {
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  openRate: number;
  clickRate: number;
  byCategory: Record<string, number>;
};

export async function fetchNotificationStats(days = 30): Promise<{
  data: NotificationStats | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_notification_stats', { p_days: days });

  if (error) return { data: null, error: supabaseErrorMessage(error)! };

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    data: {
      sentCount: Number(raw.sent_count ?? 0),
      openedCount: Number(raw.opened_count ?? 0),
      clickedCount: Number(raw.clicked_count ?? 0),
      openRate: Number(raw.open_rate ?? 0),
      clickRate: Number(raw.click_rate ?? 0),
      byCategory: (raw.by_category as Record<string, number>) ?? {},
    },
    error: null,
  };
}
