import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminFeedContentTargetType =
  | 'post'
  | 'reel'
  | 'comment'
  | 'business_ad'
  | 'marketplace_listing'
  | 'business_shop'
  | 'business';

export type AdminFeedModerateAction = 'hide' | 'remove' | 'restore' | 'delete_permanent';

export type RemovedContentRow = {
  target_type: AdminFeedContentTargetType;
  target_id: string;
  title: string;
  status: string;
  owner_id: string | null;
  owner_username: string | null;
  owner_full_name: string | null;
  removed_at: string;
};

export const REMOVED_CONTENT_TYPE_LABELS: Record<AdminFeedContentTargetType, string> = {
  post: 'Gönderi',
  reel: 'Reel',
  comment: 'Yorum',
  business_ad: 'Reklam',
  marketplace_listing: 'Pazar ilanı',
  business_shop: 'Mağaza',
  business: 'İşletme',
};

export async function adminModerateFeedContent(
  targetType: AdminFeedContentTargetType,
  targetId: string,
  action: AdminFeedModerateAction,
  reason = 'Admin moderasyon',
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_moderate_feed_content', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_action: action,
    p_reason: reason,
  });
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: (data as Record<string, unknown>) ?? null, error: null };
}

export async function fetchRemovedContent(limit = 50): Promise<{
  data: RemovedContentRow[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_list_removed_content', { p_limit: limit });
  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data as RemovedContentRow[]) ?? [], error: null };
}
