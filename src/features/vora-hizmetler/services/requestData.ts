import type { CreateServiceRequestInput, ServiceRequestListing, UpdateServiceRequestInput } from '@/features/vora-hizmetler/types';
import {
  DEFAULT_SERVICE_MAP_RADIUS_KM,
  mapServiceError,
  SERVICE_MAX_DESCRIPTION_LENGTH,
  SERVICE_MAX_TITLE_LENGTH,
  SERVICE_MIN_DESCRIPTION_LENGTH,
  SERVICE_MIN_TITLE_LENGTH,
} from '@/features/vora-hizmetler/constants';
import { distanceKm } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type RequestRow = {
  id: string;
  requester_id: string;
  region_id: string | null;
  city: string | null;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  image_urls: string[];
  completion_proof_image_url: string | null;
  completion_proof_video_url: string | null;
  completion_proof_submitted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  offer_count: number;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

const REQUEST_SELECT = `
  id, requester_id, region_id, city, title, description, category, urgency, status,
  budget_min, budget_max, image_urls,
  completion_proof_image_url, completion_proof_video_url, completion_proof_submitted_at,
  latitude, longitude, offer_count, is_emergency,
  created_at, updated_at,
  profiles!vora_service_requests_requester_id_fkey (full_name, avatar_url)
`;

function mapRow(
  row: RequestRow,
  center?: { latitude: number; longitude: number },
): ServiceRequestListing {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const listing: ServiceRequestListing = {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: profile?.full_name ?? null,
    requesterAvatar: profile?.avatar_url ?? null,
    regionId: row.region_id,
    city: row.city,
    title: row.title,
    description: row.description,
    category: row.category as ServiceRequestListing['category'],
    urgency: row.urgency as ServiceRequestListing['urgency'],
    status: row.status as ServiceRequestListing['status'],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    imageUrls: row.image_urls ?? [],
    completionProof: {
      imageUrl: row.completion_proof_image_url ?? null,
      videoUrl: row.completion_proof_video_url ?? null,
      submittedAt: row.completion_proof_submitted_at ?? null,
    },
    latitude: row.latitude,
    longitude: row.longitude,
    offerCount: row.offer_count,
    isEmergency: row.is_emergency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

export async function fetchServiceRequests(params: {
  regionId?: string | null;
  category?: string;
  requesterId?: string;
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
  limit?: number;
  offset?: number;
}): Promise<{ listings: ServiceRequestListing[]; error?: string }> {
  let query = supabase
    .from('vora_service_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'pending_offers')
    .order('is_emergency', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.requesterId) {
    query = supabase
      .from('vora_service_requests')
      .select(REQUEST_SELECT)
      .eq('requester_id', params.requesterId)
      .order('created_at', { ascending: false });
  } else if (params.regionId) {
    query = query.eq('region_id', params.regionId);
  }

  if (params.category) {
    query = query.eq('category', params.category);
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return { listings: [], error: supabaseErrorMessage(error) };

  let listings = (data as RequestRow[]).map((row) => mapRow(row, params.center));

  if (params.center && params.radiusKm) {
    listings = listings.filter(
      (l) => l.distanceKm == null || l.distanceKm <= (params.radiusKm ?? DEFAULT_SERVICE_MAP_RADIUS_KM),
    );
  }

  return { listings };
}

export async function fetchServiceRequestById(
  id: string,
  center?: { latitude: number; longitude: number },
): Promise<{ listing: ServiceRequestListing | null; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_requests')
    .select(REQUEST_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return { listing: null, error: supabaseErrorMessage(error) };
  if (!data) return { listing: null };
  return { listing: mapRow(data as RequestRow, center) };
}

export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<{ id?: string; error?: string }> {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < SERVICE_MIN_TITLE_LENGTH || title.length > SERVICE_MAX_TITLE_LENGTH) {
    return { error: mapServiceError('vora_service_requests_title_check') };
  }
  if (description.length < SERVICE_MIN_DESCRIPTION_LENGTH || description.length > SERVICE_MAX_DESCRIPTION_LENGTH) {
    return { error: mapServiceError('vora_service_requests_description_check') };
  }

  const { data, error } = await supabase
    .from('vora_service_requests')
    .insert({
      requester_id: input.requesterId,
      region_id: input.regionId,
      city: input.city,
      title,
      description,
      category: input.category,
      urgency: input.urgency,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      image_urls: input.imageUrls ?? [],
      is_emergency: input.isEmergency ?? false,
    })
    .select('id')
    .single();

  if (error) return { error: mapServiceError(supabaseErrorMessage(error)) };

  if (input.latitude != null && input.longitude != null && data?.id) {
    await supabase.rpc('set_vora_service_request_location', {
      p_request_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id };
}

export async function updateServiceRequest(
  input: UpdateServiceRequestInput,
): Promise<{ error?: string }> {
  const { listing } = await fetchServiceRequestById(input.requestId);
  if (!listing) return { error: 'Talep bulunamadı.' };
  if (listing.requesterId !== input.requesterId) return { error: 'Bu talebi düzenleyemezsiniz.' };
  if (listing.status !== 'pending_offers') {
    return { error: 'Kabul edilmiş veya tamamlanmış talepler düzenlenemez.' };
  }

  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < SERVICE_MIN_TITLE_LENGTH || title.length > SERVICE_MAX_TITLE_LENGTH) {
    return { error: mapServiceError('vora_service_requests_title_check') };
  }
  if (description.length < SERVICE_MIN_DESCRIPTION_LENGTH || description.length > SERVICE_MAX_DESCRIPTION_LENGTH) {
    return { error: mapServiceError('vora_service_requests_description_check') };
  }

  const { error } = await supabase
    .from('vora_service_requests')
    .update({
      title,
      description,
      category: input.category,
      urgency: input.urgency,
      city: input.city ?? listing.city,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      image_urls: input.imageUrls ?? listing.imageUrls,
    })
    .eq('id', input.requestId)
    .eq('requester_id', input.requesterId)
    .eq('status', 'pending_offers');

  if (!error) return {};

  const message = supabaseErrorMessage(error);
  if (message.includes('vora_service_request_not_editable')) {
    return { error: 'Bu talep artık düzenlenemez.' };
  }
  return { error: mapServiceError(message) };
}

export async function cancelServiceRequest(
  requestId: string,
  requesterId: string,
): Promise<{ error?: string }> {
  const { listing } = await fetchServiceRequestById(requestId);
  if (!listing) return { error: 'Talep bulunamadı.' };
  if (listing.requesterId !== requesterId) return { error: 'Bu ilanı kaldıramazsınız.' };
  if (listing.status !== 'pending_offers') {
    return { error: 'Kabul edilmiş veya devam eden ilanlar kaldırılamaz.' };
  }

  const result = await updateServiceRequestStatus(requestId, 'cancelled');
  if (result.error?.includes('vora_service_request_not_cancellable')) {
    return { error: 'Bu ilan artık kaldırılamaz.' };
  }
  return result;
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestListing['status'],
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('vora_service_requests')
    .update({ status })
    .eq('id', requestId);

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function acceptServiceOffer(
  requestId: string,
  offerId: string,
  providerId: string,
): Promise<{ error?: string }> {
  const { error: offerError } = await supabase
    .from('vora_service_offers')
    .update({ status: 'accepted' })
    .eq('id', offerId);

  if (offerError) return { error: supabaseErrorMessage(offerError) };

  await supabase
    .from('vora_service_offers')
    .update({ status: 'rejected' })
    .eq('request_id', requestId)
    .neq('id', offerId)
    .eq('status', 'pending');

  const { error } = await supabase
    .from('vora_service_requests')
    .update({
      status: 'offer_accepted',
      accepted_offer_id: offerId,
      accepted_provider_id: providerId,
    })
    .eq('id', requestId);

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function fetchServiceHistory(
  userId: string,
): Promise<{ items: ServiceRequestListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_requests')
    .select(REQUEST_SELECT)
    .eq('requester_id', userId)
    .in('status', ['completed', 'rated', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return { items: [], error: supabaseErrorMessage(error) };
  return { items: (data as RequestRow[]).map((row) => mapRow(row)) };
}

export async function inviteProviderToRequest(
  requestId: string,
  providerId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('invite_vora_provider_to_request', {
    p_request_id: requestId,
    p_provider_id: providerId,
  });

  if (!error) return {};

  const message = supabaseErrorMessage(error);
  return { error: mapServiceError(message) || message };
}

export async function fetchMyOpenListings(
  userId: string,
): Promise<{ listings: ServiceRequestListing[]; error?: string }> {
  const result = await fetchServiceRequests({ requesterId: userId, limit: 50 });
  if (result.error) return { listings: [], error: result.error };
  return {
    listings: result.listings.filter((item) => item.status === 'pending_offers'),
  };
}

export async function countNearbyProvidersByCategory(
  category: string,
  regionId: string | null,
): Promise<number> {
  let query = supabase
    .from('vora_service_providers')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .contains('categories', [category]);

  if (regionId) {
    query = query.eq('region_id', regionId);
  }

  const { count } = await query;
  return count ?? 0;
}
