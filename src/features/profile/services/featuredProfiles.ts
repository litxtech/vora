import { regionNameById } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';

export type FeaturedProfileCard = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  occupation: string | null;
  district: string | null;
  regionName: string | null;
  isVerified: boolean;
  isPremium: boolean;
  boostedUntil: string;
  campaignMessage: string | null;
};

const FEATURED_PROFILE_COLUMNS =
  'id, username, full_name, avatar_url, bio, occupation, district, region_id, is_verified, is_premium, profile_boosted_until, profile_boost_message';

export async function fetchFeaturedProfiles(
  regionId: string,
  options?: { excludeUserId?: string; limit?: number; karadenizWide?: boolean },
): Promise<FeaturedProfileCard[]> {
  const limit = options?.limit ?? 12;
  const now = new Date().toISOString();

  let query = supabase
    .from('profiles')
    .select(FEATURED_PROFILE_COLUMNS)
    .eq('account_status', 'active')
    .eq('is_guest', false)
    .gt('profile_boosted_until', now)
    .order('profile_boosted_until', { ascending: false })
    .limit(limit);

  if (!options?.karadenizWide) {
    query = query.eq('region_id', regionId);
  }

  if (options?.excludeUserId) {
    query = query.neq('id', options.excludeUserId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => ({
      id: row.id,
      username: row.username ?? '',
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      occupation: row.occupation,
      district: row.district,
      regionName: regionNameById(row.region_id) ?? null,
      isVerified: row.is_verified,
      isPremium: row.is_premium,
      boostedUntil: row.profile_boosted_until!,
      campaignMessage: row.profile_boost_message?.trim() || null,
    }));
}

export const PROFILE_BOOST_BENEFITS = [
  'Ana akışta ve Keşfet\'te vitrinde görünürsünüz',
  'Kampanya metniniz modern vitrin kartında yayınlanır',
  'Gönderileriniz akışta öncelikli sıralanır',
  'Profilinizde "Öne Çıkan" rozeti gösterilir',
  '7 gün boyunca bölgenizdeki kullanıcılara önerilirsiniz',
] as const;
