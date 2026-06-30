import {
  formatServiceDate,
  serviceCategoryLabel,
  serviceUrgencyLabel,
  serviceRequestDetailPath,
} from '@/features/vora-hizmetler/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchVoraHizmetlerRequestDetail(
  id: string,
): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('vora_service_requests')
    .select(
      `id, title, description, category, urgency, status, city, region_id,
       budget_min, budget_max, image_urls, latitude, longitude, is_emergency,
       offer_count, created_at, requester_id`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  return {
    type: 'vora_hizmetler',
    id: data.id,
    title: data.title,
    subtitle: serviceCategoryLabel(data.category),
    description: data.description,
    mediaUrls: data.image_urls ?? [],
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.requester_id,
    fields: [
      { label: 'Kategori', value: serviceCategoryLabel(data.category) },
      { label: 'Aciliyet', value: serviceUrgencyLabel(data.urgency) },
      { label: 'Konum', value: data.city ?? regionName(data.region_id) ?? '—' },
      { label: 'Teklif', value: String(data.offer_count ?? 0) },
      ...(data.is_emergency ? [{ label: 'Acil', value: 'Evet' }] : []),
      { label: 'Talep', value: formatDate(data.created_at) ?? formatServiceDate(data.created_at) },
    ],
  };
}

export async function fetchVoraHizmetlerProviderDetail(
  id: string,
): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('vora_service_providers')
    .select(
      `id, display_name, profession, bio, city, region_id, rating, review_count,
       completed_jobs, is_premium, is_sponsored, latitude, longitude, user_id, created_at`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  return {
    type: 'vora_hizmetler',
    id: data.id,
    title: data.display_name,
    subtitle: data.profession,
    description: data.bio,
    mediaUrls: [],
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.user_id,
    fields: [
      { label: 'Puan', value: Number(data.rating).toFixed(1) },
      { label: 'Tamamlanan iş', value: String(data.completed_jobs ?? 0) },
      { label: 'Konum', value: data.city ?? regionName(data.region_id) ?? '—' },
      ...(data.is_premium ? [{ label: 'Premium', value: 'Evet' }] : []),
      ...(data.is_sponsored ? [{ label: 'Sponsorlu', value: 'Evet' }] : []),
    ],
  };
}

/** Harita pin detayı — önce talep, sonra usta profili dener. */
export async function fetchVoraHizmetlerDetail(id: string): Promise<MapDetailRecord | null> {
  const request = await fetchVoraHizmetlerRequestDetail(id);
  if (request) return request;
  return fetchVoraHizmetlerProviderDetail(id);
}
