import type {
  CreateServiceOfferInput,
  ServiceOfferInboxItem,
  ServiceOfferListing,
} from '@/features/vora-hizmetler/types';
import { distanceKm } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type OfferRow = {
  id: string;
  request_id: string;
  provider_id: string;
  price: number;
  estimated_arrival: string | null;
  message: string | null;
  warranty_months: number | null;
  status: string;
  created_at: string;
  vora_service_providers?: {
    display_name: string;
    avatar_url: string | null;
    rating: number;
    completed_jobs: number;
    completion_rate: number;
    response_minutes: number | null;
    is_premium: boolean;
    latitude: number | null;
    longitude: number | null;
  } | null;
  vora_service_requests?: {
    title: string;
    status: string;
    requester_id: string;
  } | null;
};

const OFFER_SELECT = `
  id, request_id, provider_id, price, estimated_arrival, message, warranty_months, status, created_at,
  vora_service_providers!vora_service_offers_provider_id_fkey (
    display_name, avatar_url, rating, completed_jobs, completion_rate, response_minutes, is_premium, latitude, longitude
  )
`;

const OFFER_INBOX_SELECT = `
  id, request_id, provider_id, price, estimated_arrival, message, warranty_months, status, created_at,
  vora_service_providers!vora_service_offers_provider_id_fkey (
    display_name, avatar_url, rating, completed_jobs, completion_rate, response_minutes, is_premium, latitude, longitude
  ),
  vora_service_requests!vora_service_offers_request_id_fkey (
    title, status, requester_id
  )
`;

function mapRow(
  row: OfferRow,
  center?: { latitude: number; longitude: number },
): ServiceOfferListing {
  const provider = Array.isArray(row.vora_service_providers)
    ? row.vora_service_providers[0]
    : row.vora_service_providers;

  const listing: ServiceOfferListing = {
    id: row.id,
    requestId: row.request_id,
    providerId: row.provider_id,
    providerName: provider?.display_name ?? null,
    providerAvatar: provider?.avatar_url ?? null,
    providerRating: provider?.rating ?? 0,
    providerJobCount: provider?.completed_jobs ?? 0,
    providerCompletionRate: provider?.completion_rate ?? 100,
    providerResponseMinutes: provider?.response_minutes ?? null,
    providerIsPremium: provider?.is_premium ?? false,
    price: row.price,
    estimatedArrival: row.estimated_arrival,
    message: row.message,
    warrantyMonths: row.warranty_months,
    status: row.status as ServiceOfferListing['status'],
    createdAt: row.created_at,
  };

  if (center && provider?.latitude != null && provider?.longitude != null) {
    listing.distanceKm = distanceKm(center, {
      latitude: provider.latitude,
      longitude: provider.longitude,
    });
  }

  return listing;
}

function mapInboxRow(row: OfferRow, userId: string): ServiceOfferInboxItem {
  const request = Array.isArray(row.vora_service_requests)
    ? row.vora_service_requests[0]
    : row.vora_service_requests;
  const listing = mapRow(row);

  return {
    ...listing,
    requestTitle: request?.title ?? 'Hizmet talebi',
    requestStatus: (request?.status ?? 'pending_offers') as ServiceOfferInboxItem['requestStatus'],
    direction: request?.requester_id === userId ? 'incoming' : 'outgoing',
  };
}

export async function fetchOffersForRequest(
  requestId: string,
  center?: { latitude: number; longitude: number },
): Promise<{ offers: ServiceOfferListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_offers')
    .select(OFFER_SELECT)
    .eq('request_id', requestId)
    .order('price', { ascending: true });

  if (error) return { offers: [], error: supabaseErrorMessage(error) };
  const offers = (data as OfferRow[]).map((row) => mapRow(row, center));
  offers.sort((a, b) => {
    if (a.providerIsPremium !== b.providerIsPremium) return a.providerIsPremium ? -1 : 1;
    return a.price - b.price;
  });
  return { offers };
}

export async function fetchUserOfferInbox(
  userId: string,
  providerId?: string | null,
): Promise<{ items: ServiceOfferInboxItem[]; error?: string }> {
  const filters: string[] = [];

  if (providerId) {
    filters.push(`provider_id.eq.${providerId}`);
  }

  const { data: myRequests } = await supabase
    .from('vora_service_requests')
    .select('id')
    .eq('requester_id', userId);

  const requestIds = (myRequests ?? []).map((r) => r.id);
  if (requestIds.length) {
    filters.push(`request_id.in.(${requestIds.join(',')})`);
  }

  if (!filters.length && !providerId) {
    return { items: [] };
  }

  let query = supabase
    .from('vora_service_offers')
    .select(OFFER_INBOX_SELECT)
    .order('created_at', { ascending: false })
    .limit(40);

  if (filters.length === 1) {
    if (providerId && filters[0].startsWith('provider_id')) {
      query = query.eq('provider_id', providerId);
    } else if (requestIds.length) {
      query = query.in('request_id', requestIds);
    }
  } else if (providerId && requestIds.length) {
    query = query.or(`provider_id.eq.${providerId},request_id.in.(${requestIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) return { items: [], error: supabaseErrorMessage(error) };

  const items = (data as OfferRow[]).map((row) => mapInboxRow(row, userId));
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { items };
}

export async function createServiceOffer(
  input: CreateServiceOfferInput,
): Promise<{ id?: string; error?: string; revised?: boolean }> {
  const payload = {
    price: input.price,
    estimated_arrival: input.estimatedArrival ?? null,
    message: input.message?.trim() || null,
    warranty_months: input.warrantyMonths ?? null,
    status: 'pending' as const,
  };

  const { data: existing, error: lookupError } = await supabase
    .from('vora_service_offers')
    .select('id, status')
    .eq('request_id', input.requestId)
    .eq('provider_id', input.providerId)
    .maybeSingle();

  if (lookupError) return { error: supabaseErrorMessage(lookupError) };

  if (existing) {
    if (existing.status === 'pending' || existing.status === 'accepted') {
      return { error: 'Bu talebe zaten aktif bir teklifiniz var.' };
    }

    const { data, error } = await supabase
      .from('vora_service_offers')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) return { error: supabaseErrorMessage(error) };
    return { id: data.id, revised: true };
  }

  const { data, error } = await supabase
    .from('vora_service_offers')
    .insert({
      request_id: input.requestId,
      provider_id: input.providerId,
      ...payload,
    })
    .select('id')
    .single();

  if (error) return { error: supabaseErrorMessage(error) };
  return { id: data.id };
}

export async function withdrawServiceOffer(offerId: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc('withdraw_vora_service_offer', {
    p_offer_id: offerId,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'Teklif geri çekilemedi.' };
  return {};
}

export async function rejectServiceOffer(offerId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('vora_service_offers')
    .update({ status: 'rejected' })
    .eq('id', offerId)
    .eq('status', 'pending');

  return error ? { error: supabaseErrorMessage(error) } : {};
}

export async function fetchProviderOffers(
  providerId: string,
): Promise<{ offers: ServiceOfferListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_offers')
    .select(OFFER_SELECT)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { offers: [], error: supabaseErrorMessage(error) };
  return { offers: (data as OfferRow[]).map((row) => mapRow(row)) };
}
