import { distanceKm } from '@/features/map/utils/geo';
import type {
  CreateLostItemInput,
  LostItemTip,
  LostListing,
  LostItemCategory,
  LostItemType,
  UpdateLostItemInput,
} from '@/features/lost-found/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

type LostRow = {
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

const LOST_SELECT = `
  id, item_type, category, title, description, contact_info, media_urls,
  region_id, district, location_name, author_id, status, is_urgent,
  reward_amount, view_count, latitude, longitude, last_seen_at, created_at,
  profiles!lost_items_author_id_fkey (username, full_name, avatar_url)
`;

function mapRow(row: LostRow, center?: { latitude: number; longitude: number }): LostListing {
  const listing: LostListing = {
    id: row.id,
    itemType: row.item_type as LostItemType,
    category: row.category as LostItemCategory,
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

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

export async function fetchLostListings(
  regionId: string,
  filters: {
    itemType?: LostItemType;
    category?: LostItemCategory;
    status?: 'open' | 'resolved';
    authorId?: string;
    urgentOnly?: boolean;
    center?: { latitude: number; longitude: number };
    radiusKm?: number;
  } = {},
): Promise<LostListing[]> {
  let query = supabase.from('lost_items').select(LOST_SELECT).eq('region_id', regionId);

  if (filters.itemType) query = query.eq('item_type', filters.itemType);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.status) query = query.eq('status', filters.status);
  else if (!filters.authorId) query = query.eq('status', 'open');
  if (filters.authorId) query = query.eq('author_id', filters.authorId);
  if (filters.urgentOnly) query = query.eq('is_urgent', true);

  query = query.order('is_urgent', { ascending: false }).order('created_at', { ascending: false }).limit(60);

  const { data } = await query;
  let listings = ((data ?? []) as unknown as LostRow[]).map((row) => mapRow(row, filters.center));

  if (filters.center && filters.radiusKm) {
    listings = listings.filter((l) => l.distanceKm != null && l.distanceKm <= filters.radiusKm!);
    listings.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return listings;
}

export async function createLostItem(input: CreateLostItemInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('lost_items')
    .insert({
      author_id: input.authorId,
      region_id: input.regionId,
      item_type: input.itemType,
      category: input.category,
      title: input.title,
      description: input.description,
      contact_info: input.contactInfo,
      location_name: input.locationName,
      district: input.district,
      media_urls: input.mediaUrls,
      is_urgent: input.isUrgent,
      reward_amount: input.rewardAmount,
      last_seen_at: input.lastSeenAt,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  if (!data) return { id: null, error: 'İlan oluşturulamadı.' };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_lost_item_location', {
      p_item_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id, error: null };
}

export async function fetchLostItemForEdit(itemId: string, authorId: string): Promise<LostListing | null> {
  const { data } = await supabase
    .from('lost_items')
    .select(LOST_SELECT)
    .eq('id', itemId)
    .eq('author_id', authorId)
    .maybeSingle();

  if (!data) return null;
  return mapRow(data as unknown as LostRow);
}

export async function updateLostItem(input: UpdateLostItemInput): Promise<{ error: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from('lost_items')
    .select('author_id')
    .eq('id', input.itemId)
    .maybeSingle();

  if (readError) return { error: supabaseErrorMessage(readError)! };
  if (!existing || existing.author_id !== input.authorId) {
    return { error: 'Bu ilanı düzenleme yetkiniz yok.' };
  }

  const { error } = await supabase
    .from('lost_items')
    .update({
      item_type: input.itemType,
      category: input.category,
      title: input.title,
      description: input.description,
      contact_info: input.contactInfo,
      location_name: input.locationName,
      district: input.district,
      media_urls: input.mediaUrls,
      is_urgent: input.isUrgent,
      reward_amount: input.rewardAmount,
      last_seen_at: input.lastSeenAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.itemId)
    .eq('author_id', input.authorId);

  if (error) return { error: supabaseErrorMessage(error)! };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_lost_item_location', {
      p_item_id: input.itemId,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { error: null };
}

export async function deleteLostItem(itemId: string, authorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('lost_items')
    .delete()
    .eq('id', itemId)
    .eq('author_id', authorId);

  if (!error) {
    notifyMapMarkerRemovedBySource('lost_found', itemId);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function resolveLostItem(itemId: string, authorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('lost_items')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('author_id', authorId);

  if (!error) {
    notifyMapMarkerRemovedBySource('lost_found', itemId);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function incrementLostItemView(itemId: string): Promise<boolean> {
  const { data } = await supabase.rpc('increment_lost_item_view', { p_item_id: itemId });
  return data ?? false;
}

export async function submitLostItemTip(
  itemId: string,
  reporterId: string,
  message: string,
  contactInfo: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('lost_item_tips').insert({
    lost_item_id: itemId,
    reporter_id: reporterId,
    message: message.trim(),
    contact_info: contactInfo?.trim() || null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchLostItemTips(itemId: string, authorId: string): Promise<LostItemTip[]> {
  const { data: item } = await supabase.from('lost_items').select('author_id').eq('id', itemId).maybeSingle();
  if (!item || item.author_id !== authorId) return [];

  const { data } = await supabase
    .from('lost_item_tips')
    .select('id, message, contact_info, created_at, profiles!lost_item_tips_reporter_id_fkey (username, full_name)')
    .eq('lost_item_id', itemId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      message: row.message,
      contactInfo: row.contact_info,
      reporterName: profile?.full_name ?? profile?.username ?? null,
      createdAt: row.created_at,
    };
  });
}
