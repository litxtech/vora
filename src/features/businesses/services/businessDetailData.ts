import { regionNameById } from '@/constants/regions';
import { businessCategoryLabel } from '@/features/businesses/constants';
import type {
  BusinessCampaignPreview,
  BusinessDetail,
  BusinessEventPreview,
  BusinessJobPreview,
} from '@/features/businesses/types';
import { supabase } from '@/lib/supabase/client';

export async function fetchBusinessDetail(id: string): Promise<BusinessDetail | null> {
  const { data } = await supabase
    .from('businesses')
    .select(
      `id, name, category, description, phone, email, website, address, district,
       logo_url, cover_url, is_verified, region_id, latitude, longitude, owner_id, view_count, created_at,
       profiles:owner_id (avatar_url, cover_url)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  const owner = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const logoUrl = data.logo_url ?? owner?.avatar_url ?? null;
  const coverUrl = data.cover_url ?? owner?.cover_url ?? null;

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    categoryLabel: businessCategoryLabel(data.category),
    description: data.description,
    phone: data.phone,
    email: data.email,
    website: data.website,
    address: data.address,
    district: data.district,
    regionName: regionNameById(data.region_id) ?? null,
    logoUrl,
    coverUrl,
    isVerified: data.is_verified,
    latitude: data.latitude,
    longitude: data.longitude,
    ownerId: data.owner_id,
    viewCount: data.view_count ?? 0,
    createdAt: data.created_at,
  };
}

export async function incrementBusinessViewCount(businessId: string): Promise<void> {
  await supabase.rpc('increment_business_view_count', { p_business_id: businessId });
}

export async function fetchBusinessCampaigns(businessId: string): Promise<BusinessCampaignPreview[]> {
  const { data } = await supabase
    .from('business_campaigns')
    .select('id, title, description, image_url, starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
}

export async function fetchBusinessEvents(ownerId: string): Promise<BusinessEventPreview[]> {
  const { data } = await supabase
    .from('events')
    .select('id, title, description, starts_at, location_name, cover_url')
    .eq('organizer_id', ownerId)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(8);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    locationName: row.location_name,
    coverUrl: row.cover_url,
  }));
}

export async function fetchBusinessJobs(businessId: string): Promise<BusinessJobPreview[]> {
  const { data } = await supabase
    .from('job_listings')
    .select('id, title, description, job_type, salary_range, created_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    salaryRange: row.salary_range,
    createdAt: row.created_at,
  }));
}
