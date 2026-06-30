import { supabase } from '@/lib/supabase/client';

/** Profil ziyaretinde gösterilecek yayın mağazası (kurumsal veya bireyselde opsiyonel). */
export async function fetchProfileVisibleShopBusinessId(
  profileId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_profile_visible_shop_business_id', {
    p_profile_id: profileId,
  });
  if (error || !data) return null;
  return data as string;
}
