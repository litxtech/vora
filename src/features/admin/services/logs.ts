import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { ModerationLogRow } from '@/features/admin/types';

export async function fetchModerationLogs(action?: string | null, limit = 100) {
  const { data, error } = await supabase.rpc('admin_list_moderation_logs', {
    p_action: action ?? null,
    p_limit: limit,
  });
  if (error) {
    const fallback = await supabase
      .from('moderation_actions')
      .select('id, moderator_id, target_type, target_id, action, reason, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return {
      data: fallback.data ?? [],
      error: supabaseErrorMessage(fallback.error) ?? supabaseErrorMessage(error) ?? 'Kayıtlar yüklenemedi.',
    };
  }
  return { data: (data ?? []) as ModerationLogRow[], error: null };
}

export function moderationLogsToCsv(logs: ModerationLogRow[]): string {
  const header = 'Tarih,Moderatör,Aksiyon,Hedef,Tür,Sebep';
  const rows = logs.map((log) => {
    const date = new Date(log.created_at).toLocaleString('tr-TR');
    const mod = log.moderator?.username ?? log.moderator_username ?? log.moderator_id;
    return [date, mod, log.action, log.target_id, log.target_type, log.reason ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  return [header, ...rows].join('\n');
}
