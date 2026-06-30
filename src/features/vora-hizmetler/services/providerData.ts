import type {
  ProviderCertificate,
  ProviderDiscoverItem,
  ProviderPortfolioItem,
  ServiceCategory,
  ServiceProviderProfile,
} from '@/features/vora-hizmetler/types';
import { distanceKm } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type ProviderRow = {
  id: string;
  user_id: string;
  display_name: string;
  profession: string;
  bio: string | null;
  city: string | null;
  region_id: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  phone_verified: boolean;
  identity_verified: boolean;
  workplace_verified: boolean;
  rating: number;
  review_count: number;
  completed_jobs: number;
  completion_rate: number;
  response_minutes: number | null;
  membership_years: number;
  account_type: string;
  categories: string[];
  badges: string[];
  is_premium: boolean;
  is_sponsored: boolean;
  is_active: boolean;
  show_on_profile: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

const PROVIDER_SELECT = `
  id, user_id, display_name, profession, bio, city, region_id, avatar_url, cover_url,
  phone_verified, identity_verified, workplace_verified, rating, review_count,
  completed_jobs, completion_rate, response_minutes, membership_years, account_type,
  categories, badges, is_premium, is_sponsored, is_active, show_on_profile, latitude, longitude, created_at
`;

function mapProviderRow(
  row: ProviderRow,
  center?: { latitude: number; longitude: number },
  extras?: { isFavorited?: boolean; isSubscribed?: boolean },
): ServiceProviderProfile {
  const profile: ServiceProviderProfile = {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    profession: row.profession,
    city: row.city,
    regionId: row.region_id,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    bio: row.bio,
    phoneVerified: row.phone_verified,
    identityVerified: row.identity_verified,
    workplaceVerified: row.workplace_verified,
    rating: row.rating,
    reviewCount: row.review_count,
    completedJobs: row.completed_jobs,
    completionRate: row.completion_rate,
    responseMinutes: row.response_minutes,
    membershipYears: row.membership_years,
    accountType: row.account_type as ServiceProviderProfile['accountType'],
    categories: row.categories as ServiceCategory[],
    badges: row.badges as ServiceProviderProfile['badges'],
    isPremium: row.is_premium,
    isSponsored: row.is_sponsored,
    isActive: row.is_active,
    showOnProfile: row.show_on_profile ?? true,
    latitude: row.latitude,
    longitude: row.longitude,
    isFavorited: extras?.isFavorited,
    isSubscribed: extras?.isSubscribed,
    createdAt: row.created_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    profile.latitude = row.latitude;
    profile.longitude = row.longitude;
  }

  return profile;
}

export async function fetchProviderById(
  id: string,
  viewerId?: string | null,
  center?: { latitude: number; longitude: number },
): Promise<{ provider: ServiceProviderProfile | null; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_providers')
    .select(PROVIDER_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return { provider: null, error: supabaseErrorMessage(error) };
  if (!data) return { provider: null };

  let isFavorited = false;
  let isSubscribed = false;

  if (viewerId) {
    const [favRes, subRes] = await Promise.all([
      supabase
        .from('vora_service_favorites')
        .select('provider_id')
        .eq('user_id', viewerId)
        .eq('provider_id', id)
        .maybeSingle(),
      supabase
        .from('vora_service_subscriptions')
        .select('provider_id')
        .eq('user_id', viewerId)
        .eq('provider_id', id)
        .maybeSingle(),
    ]);
    isFavorited = !!favRes.data;
    isSubscribed = !!subRes.data;
  }

  return {
    provider: mapProviderRow(data as ProviderRow, center, { isFavorited, isSubscribed }),
  };
}

export async function fetchProviderByUserId(
  userId: string,
): Promise<{ provider: ServiceProviderProfile | null; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_providers')
    .select(PROVIDER_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { provider: null, error: supabaseErrorMessage(error) };
  if (!data) return { provider: null };
  return { provider: mapProviderRow(data as ProviderRow) };
}

export async function fetchNearbyProviders(params: {
  category?: ServiceCategory;
  regionId?: string | null;
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
  limit?: number;
}): Promise<{ providers: ServiceProviderProfile[]; error?: string }> {
  let query = supabase
    .from('vora_service_providers')
    .select(PROVIDER_SELECT)
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('is_premium', { ascending: false })
    .order('rating', { ascending: false })
    .limit(params.limit ?? 30);

  if (params.category) {
    query = query.contains('categories', [params.category]);
  }
  if (params.regionId) {
    query = query.eq('region_id', params.regionId);
  }

  const { data, error } = await query;
  if (error) return { providers: [], error: supabaseErrorMessage(error) };

  let providers = (data as ProviderRow[]).map((row) => mapProviderRow(row, params.center));

  if (params.center && params.radiusKm) {
    providers = providers.filter((p) => {
      if (p.latitude == null || p.longitude == null) return true;
      return distanceKm(params.center!, { latitude: p.latitude, longitude: p.longitude }) <= params.radiusKm!;
    });
  }

  return { providers };
}

export async function upsertProviderProfile(input: {
  userId: string;
  displayName: string;
  profession: string;
  bio?: string | null;
  city?: string | null;
  regionId?: string | null;
  categories: ServiceCategory[];
  accountType?: 'individual' | 'business';
  latitude?: number;
  longitude?: number;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  isActive?: boolean;
}): Promise<{ id?: string; error?: string }> {
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    display_name: input.displayName.trim(),
    profession: input.profession.trim(),
    bio: input.bio?.trim() || null,
    city: input.city ?? null,
    region_id: input.regionId ?? null,
    categories: input.categories,
    account_type: input.accountType ?? 'individual',
  };

  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
  if (input.coverUrl !== undefined) payload.cover_url = input.coverUrl;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from('vora_service_providers')
    .upsert(payload, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (error) return { error: supabaseErrorMessage(error) };

  if (input.latitude != null && input.longitude != null && data?.id) {
    await supabase.rpc('set_vora_service_provider_location', {
      p_provider_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id };
}

export async function setProviderShowOnProfile(
  providerId: string,
  showOnProfile: boolean,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('vora_service_providers')
    .update({ show_on_profile: showOnProfile })
    .eq('id', providerId);

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function syncProviderVerification(userId: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('sync_vora_service_provider_verification', {
    p_user_id: userId,
  });
  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function setProviderWorkplaceVerified(
  providerId: string,
  verified = true,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('set_vora_service_workplace_verified', {
    p_provider_id: providerId,
    p_verified: verified,
  });
  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function addPortfolioItem(input: {
  providerId: string;
  title: string;
  description?: string | null;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  mediaUrls?: string[];
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_portfolio')
    .insert({
      provider_id: input.providerId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      before_image_url: input.beforeImageUrl ?? null,
      after_image_url: input.afterImageUrl ?? null,
      media_urls: input.mediaUrls ?? [],
    })
    .select('id')
    .single();

  if (error) return { error: supabaseErrorMessage(error) };
  return { id: data.id };
}

export async function deletePortfolioItem(itemId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('vora_service_portfolio').delete().eq('id', itemId);
  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function addProviderCertificate(input: {
  providerId: string;
  title: string;
  documentUrl?: string | null;
  issuedAt?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_certificates')
    .insert({
      provider_id: input.providerId,
      title: input.title.trim(),
      document_url: input.documentUrl ?? null,
      issued_at: input.issuedAt ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: supabaseErrorMessage(error) };
  return { id: data.id };
}

export async function deleteProviderCertificate(certificateId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('vora_service_certificates').delete().eq('id', certificateId);
  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function fetchProviderPortfolio(
  providerId: string,
): Promise<{ items: ProviderPortfolioItem[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_portfolio')
    .select('id, provider_id, title, description, before_image_url, after_image_url, media_urls, created_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) return { items: [], error: supabaseErrorMessage(error) };

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      providerId: row.provider_id,
      title: row.title,
      description: row.description,
      beforeImageUrl: row.before_image_url,
      afterImageUrl: row.after_image_url,
      mediaUrls: row.media_urls ?? [],
      createdAt: row.created_at,
    })),
  };
}

export async function fetchProviderCertificates(
  providerId: string,
): Promise<{ items: ProviderCertificate[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_certificates')
    .select('id, provider_id, title, document_url, issued_at, created_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) return { items: [], error: supabaseErrorMessage(error) };

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      providerId: row.provider_id,
      title: row.title,
      documentUrl: row.document_url,
      issuedAt: row.issued_at,
    })),
  };
}

export async function toggleProviderFavorite(
  providerId: string,
  userId: string,
  isFavorited: boolean,
): Promise<{ error?: string }> {
  if (isFavorited) {
    const { error } = await supabase
      .from('vora_service_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('provider_id', providerId);
    return error ? { error: supabaseErrorMessage(error) } : {};
  }

  const { error } = await supabase
    .from('vora_service_favorites')
    .insert({ user_id: userId, provider_id: providerId });

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function toggleProviderSubscription(
  providerId: string,
  userId: string,
  isSubscribed: boolean,
): Promise<{ error?: string }> {
  if (isSubscribed) {
    const { error } = await supabase
      .from('vora_service_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('provider_id', providerId);
    return error ? { error: supabaseErrorMessage(error) } : {};
  }

  const { error } = await supabase
    .from('vora_service_subscriptions')
    .insert({ user_id: userId, provider_id: providerId });

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function createEmergencySession(input: {
  requesterId: string;
  category: ServiceCategory;
  regionId: string | null;
  city: string | null;
  latitude?: number;
  longitude?: number;
}): Promise<{ sessionId?: string; notifiedCount?: number; error?: string }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('vora_service_emergency_sessions')
    .insert({
      requester_id: input.requesterId,
      category: input.category,
      region_id: input.regionId,
      city: input.city,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) return { error: supabaseErrorMessage(error) };

  const sessionId = data.id as string;

  await supabase.rpc('dispatch_vora_emergency_push', { p_session_id: sessionId });

  const { data: count, error: countError } = await supabase.rpc('count_vora_emergency_notifications', {
    p_session_id: sessionId,
  });

  if (countError) {
    return { sessionId, error: supabaseErrorMessage(countError) };
  }

  return { sessionId, notifiedCount: typeof count === 'number' ? count : 0 };
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

async function attachLatestReviewComments(
  providers: ServiceProviderProfile[],
): Promise<ProviderDiscoverItem[]> {
  if (!providers.length) return [];

  const providerIds = providers.map((p) => p.id);
  const { data: reviewRows } = await supabase
    .from('vora_service_reviews')
    .select('provider_id, comment, created_at')
    .in('provider_id', providerIds)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false });

  const latestByProvider = new Map<string, string>();
  for (const row of reviewRows ?? []) {
    const comment = row.comment?.trim();
    if (!comment || latestByProvider.has(row.provider_id)) continue;
    latestByProvider.set(row.provider_id, comment);
  }

  return providers.map((provider) => ({
    ...provider,
    latestReviewComment: latestByProvider.get(provider.id) ?? null,
  }));
}

export async function searchProviders(params: {
  query?: string;
  category?: ServiceCategory;
  regionId?: string | null;
  limit?: number;
}): Promise<{ providers: ProviderDiscoverItem[]; error?: string }> {
  let query = supabase
    .from('vora_service_providers')
    .select(PROVIDER_SELECT)
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('is_premium', { ascending: false })
    .order('rating', { ascending: false })
    .order('completed_jobs', { ascending: false })
    .limit(params.limit ?? 40);

  if (params.category) {
    query = query.contains('categories', [params.category]);
  }
  if (params.regionId) {
    query = query.eq('region_id', params.regionId);
  }

  const trimmedQuery = params.query?.trim();
  if (trimmedQuery) {
    const pattern = `%${escapeIlikePattern(trimmedQuery)}%`;
    query = query.or(`profession.ilike.${pattern},display_name.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) return { providers: [], error: supabaseErrorMessage(error) };

  const providers = (data as ProviderRow[]).map((row) => mapProviderRow(row));
  const withReviews = await attachLatestReviewComments(providers);
  return { providers: withReviews };
}
