import { distanceKm } from '@/features/map/utils/geo';
import type {
  CreateVoraNeedInput,
  UpdateVoraNeedInput,
  VoraNeedCategory,
  VoraNeedFeedTab,
  VoraNeedListing,
  VoraNeedFeedFilters,
  VoraNeedVisibility,
} from '@/features/vora-needs/types';
import {
  mapVoraNeedError,
  NEARBY_NEED_RADIUS_KM,
  VORA_NEED_MAX_DESCRIPTION_LENGTH,
  VORA_NEED_MAX_TITLE_LENGTH,
  VORA_NEED_MIN_DESCRIPTION_LENGTH,
  VORA_NEED_MIN_TITLE_LENGTH,
} from '@/features/vora-needs/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

type NeedRow = {
  id: string;
  author_id: string;
  region_id: string | null;
  city: string | null;
  title: string;
  description: string;
  category: string;
  visibility: string;
  urgency: string;
  status: string;
  image_url: string | null;
  is_featured: boolean;
  view_count: number;
  favorite_count: number;
  report_count: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  profiles?: { username: string; full_name: string | null; avatar_url: string | null } | null;
};

const NEED_SELECT = `
  id, author_id, region_id, city, title, description, category, visibility, urgency,
  status, image_url, is_featured, view_count, favorite_count, report_count,
  latitude, longitude, created_at, updated_at,
  profiles!vora_needs_author_id_fkey (username, full_name, avatar_url)
`;

function mapRow(
  row: NeedRow,
  center?: { latitude: number; longitude: number },
  isFavorited?: boolean,
): VoraNeedListing {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const listing: VoraNeedListing = {
    id: row.id,
    authorId: row.author_id,
    authorName: profile?.full_name ?? null,
    authorUsername: profile?.username ?? null,
    authorAvatar: profile?.avatar_url ?? null,
    regionId: row.region_id,
    city: row.city,
    title: row.title,
    description: row.description,
    category: row.category as VoraNeedListing['category'],
    visibility: row.visibility as VoraNeedListing['visibility'],
    urgency: row.urgency as VoraNeedListing['urgency'],
    status: row.status as VoraNeedListing['status'],
    imageUrl: row.image_url,
    isFeatured: row.is_featured,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    reportCount: row.report_count,
    latitude: row.latitude,
    longitude: row.longitude,
    isFavorited,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

type SearchParams = {
  viewerRegionId?: string | null;
  tab?: VoraNeedFeedTab;
  filters?: VoraNeedFeedFilters;
  authorId?: string;
  userId?: string | null;
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
  limit?: number;
  offset?: number;
};

function buildSearchRpcParams(params: SearchParams) {
  const tab = params.tab ?? 'all';
  const filters = params.filters ?? {};

  return {
    p_viewer_region_id: params.viewerRegionId ?? null,
    p_category: filters.category ?? null,
    p_visibility: filters.visibility ?? null,
    p_urgency: null,
    p_urgent_only: tab === 'urgent' || filters.urgentOnly === true,
    p_global_only: tab === 'global',
    p_city_only: tab === 'city',
    p_author_id: tab === 'mine' ? params.authorId ?? null : null,
    p_query: filters.query?.trim() || null,
    p_lat: params.center?.latitude ?? null,
    p_lng: params.center?.longitude ?? null,
    p_radius_km: tab === 'nearby' ? (params.radiusKm ?? NEARBY_NEED_RADIUS_KM) : params.radiusKm ?? null,
    p_limit: params.limit ?? 40,
    p_offset: params.offset ?? 0,
  };
}

async function attachFavorites(listings: VoraNeedListing[], userId: string | null): Promise<VoraNeedListing[]> {
  if (!userId || listings.length === 0) return listings;

  const ids = listings.map((l) => l.id);
  const { data } = await supabase
    .from('vora_need_favorites')
    .select('need_id')
    .eq('user_id', userId)
    .in('need_id', ids);

  const favSet = new Set((data ?? []).map((r) => r.need_id));
  return listings.map((l) => ({ ...l, isFavorited: favSet.has(l.id) }));
}

export async function fetchVoraNeedsFeed(params: SearchParams): Promise<VoraNeedListing[]> {
  if (params.tab === 'favorites') {
    if (!params.userId) return [];
    const { data: favs } = await supabase
      .from('vora_need_favorites')
      .select('need_id')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(40);

    const needIds = (favs ?? []).map((f) => f.need_id);
    if (needIds.length === 0) return [];

    const { data } = await supabase
      .from('vora_needs')
      .select(NEED_SELECT)
      .in('id', needIds)
      .eq('status', 'active');

    const rows = ((data ?? []) as unknown as NeedRow[]).map((row) =>
      mapRow(row, params.center, true),
    );
    const order = new Map(needIds.map((id, i) => [id, i]));
    return rows.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }

  const { data, error } = await supabase.rpc('search_vora_needs', buildSearchRpcParams(params));
  if (error || !data) return [];

  let listings = (data as NeedRow[]).map((row) => mapRow(row, params.center));
  listings = await attachFavorites(listings, params.userId ?? null);
  return listings;
}

export async function fetchVoraNeedById(
  needId: string,
  userId?: string | null,
  center?: { latitude: number; longitude: number },
): Promise<VoraNeedListing | null> {
  const { data } = await supabase.from('vora_needs').select(NEED_SELECT).eq('id', needId).maybeSingle();
  if (!data) return null;

  let isFavorited = false;
  if (userId) {
    const { data: fav } = await supabase
      .from('vora_need_favorites')
      .select('need_id')
      .eq('user_id', userId)
      .eq('need_id', needId)
      .maybeSingle();
    isFavorited = !!fav;
  }

  return mapRow(data as unknown as NeedRow, center, isFavorited);
}

function validateVoraNeedTitle(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length < VORA_NEED_MIN_TITLE_LENGTH || trimmed.length > VORA_NEED_MAX_TITLE_LENGTH) {
    return `Başlık ${VORA_NEED_MIN_TITLE_LENGTH}–${VORA_NEED_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`;
  }
  return null;
}

function validateVoraNeedDescription(description: string): string | null {
  const trimmed = description.trim();
  if (
    trimmed.length < VORA_NEED_MIN_DESCRIPTION_LENGTH ||
    trimmed.length > VORA_NEED_MAX_DESCRIPTION_LENGTH
  ) {
    return `Açıklama ${VORA_NEED_MIN_DESCRIPTION_LENGTH}–${VORA_NEED_MAX_DESCRIPTION_LENGTH} karakter arasında olmalıdır.`;
  }
  return null;
}

function validateVoraNeedText(title: string, description: string): string | null {
  return validateVoraNeedTitle(title) ?? validateVoraNeedDescription(description);
}

export async function createVoraNeed(
  input: CreateVoraNeedInput,
): Promise<{ id: string | null; error: string | null }> {
  const validationError = validateVoraNeedText(input.title, input.description);
  if (validationError) return { id: null, error: validationError };

  const { data, error } = await supabase
    .from('vora_needs')
    .insert({
      author_id: input.authorId,
      region_id: input.visibility === 'global' ? input.regionId : input.regionId,
      city: input.city,
      title: input.title,
      description: input.description,
      category: input.category,
      visibility: input.visibility,
      urgency: input.urgency,
      image_url: input.imageUrl,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: mapVoraNeedError(error.message) };
  if (!data) return { id: null, error: 'İlan oluşturulamadı.' };

  if (input.latitude != null && input.longitude != null) {
    const { error: locError } = await supabase.rpc('set_vora_need_location', {
      p_need_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
    if (locError) return { id: data.id, error: mapVoraNeedError(locError.message) };
  }

  return { id: data.id, error: null };
}

export async function updateVoraNeed(
  needId: string,
  authorId: string,
  input: UpdateVoraNeedInput,
): Promise<{ error: string | null }> {
  if (input.title != null) {
    const titleError = validateVoraNeedTitle(input.title);
    if (titleError) return { error: titleError };
  }
  if (input.description != null) {
    const descriptionError = validateVoraNeedDescription(input.description);
    if (descriptionError) return { error: descriptionError };
  }

  const payload: Record<string, unknown> = {};
  if (input.title != null) payload.title = input.title;
  if (input.description != null) payload.description = input.description;
  if (input.category != null) payload.category = input.category;
  if (input.visibility != null) payload.visibility = input.visibility;
  if (input.urgency != null) payload.urgency = input.urgency;
  if (input.city != null) payload.city = input.city;
  if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
  if (input.status != null) payload.status = input.status;

  const { error } = await supabase
    .from('vora_needs')
    .update(payload)
    .eq('id', needId)
    .eq('author_id', authorId);

  return { error: error?.message ? mapVoraNeedError(error.message) : null };
}

export async function deleteVoraNeed(needId: string, authorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vora_needs')
    .update({ status: 'removed' })
    .eq('id', needId)
    .eq('author_id', authorId);

  if (!error) {
    notifyMapMarkerRemovedBySource('vora_needs', needId);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function hideVoraNeed(needId: string, authorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vora_needs')
    .update({ status: 'hidden' })
    .eq('id', needId)
    .eq('author_id', authorId);

  if (!error) {
    notifyMapMarkerRemovedBySource('vora_needs', needId);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function reactivateVoraNeed(needId: string, authorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vora_needs')
    .update({ status: 'active' })
    .eq('id', needId)
    .eq('author_id', authorId);

  return { error: supabaseErrorMessage(error) };
}

export async function incrementVoraNeedView(needId: string): Promise<void> {
  await supabase.rpc('increment_vora_need_view', { p_need_id: needId });
}

export async function toggleVoraNeedFavorite(
  needId: string,
  userId: string,
  isFavorited: boolean,
): Promise<{ error: string | null; isFavorited: boolean }> {
  if (isFavorited) {
    const { error } = await supabase
      .from('vora_need_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('need_id', needId);
    return { error: supabaseErrorMessage(error), isFavorited: false };
  }

  const { error } = await supabase.from('vora_need_favorites').insert({ user_id: userId, need_id: needId });
  if (error?.code === '23505') return { error: null, isFavorited: true };
  return { error: supabaseErrorMessage(error), isFavorited: true };
}

export async function reportVoraNeed(
  needId: string,
  reporterId: string,
  reason: string,
  details?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('vora_need_reports').insert({
    need_id: needId,
    reporter_id: reporterId,
    reason,
    details: details?.trim() || null,
  });

  if (error?.code === '23505') return { error: 'Bu ilanı zaten şikayet ettiniz.' };
  return { error: supabaseErrorMessage(error) };
}

export type { VoraNeedVisibility };
