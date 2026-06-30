import { supabase } from '@/lib/supabase/client';

export type AdminBadgeHolderRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  is_pioneer: boolean;
  is_platform_charm: boolean;
  granted_at: string;
};

export async function fetchAdminBadgeHolders(
  badgeType: 'all' | 'pioneer' | 'platform_charm' = 'all',
  limit = 50,
): Promise<AdminBadgeHolderRow[]> {
  const { data, error } = await supabase.rpc('admin_list_badge_holders', {
    p_badge_type: badgeType,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminBadgeHolderRow[];
}
