import { supabase } from '@/lib/supabase/client';
import type { LostListing } from '@/features/lost-found/types';

const HEADER_SELECT = `
  id, item_type, category, title, description, contact_info, media_urls,
  region_id, district, location_name, author_id, status, is_urgent,
  reward_amount, view_count, latitude, longitude, last_seen_at, created_at,
  profiles!lost_items_author_id_fkey (username, full_name, avatar_url)
`;

type HeaderRow = {
  id: string;
  item_type: string;
  category: string;
  title: string;
  description: string;
  contact_info: string | null;
  media_urls: string[];
  region_id: string;
  district: string | null;
  location_name: string | null;
  author_id: string;
  status: string;
  is_urgent: boolean;
  reward_amount: string | null;
  view_count: number;
  latitude: number | null;
  longitude: number | null;
  last_seen_at: string | null;
  created_at: string;
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null;
};

function mapHeaderRow(row: HeaderRow): LostListing {
  return {
    id: row.id,
    itemType: row.item_type as LostListing['itemType'],
    category: row.category as LostListing['category'],
    title: row.title,
    description: row.description,
    contactInfo: row.contact_info,
    mediaUrls: row.media_urls ?? [],
    regionId: row.region_id,
    district: row.district,
    locationName: row.location_name,
    authorId: row.author_id,
    authorName: row.profiles?.full_name ?? row.profiles?.username ?? null,
    authorAvatar: row.profiles?.avatar_url ?? null,
    status: row.status as LostListing['status'],
    isUrgent: row.is_urgent,
    rewardAmount: row.reward_amount,
    viewCount: row.view_count,
    latitude: row.latitude,
    longitude: row.longitude,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export async function fetchFeedHeaderLostItems(regionId: string | null, limit = 12): Promise<LostListing[]> {
  let query = supabase
    .from('lost_items')
    .select(HEADER_SELECT)
    .eq('status', 'open');

  if (regionId) query = query.eq('region_id', regionId);

  const { data } = await query
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as HeaderRow[]).map(mapHeaderRow);
}
