import { supabase } from '@/lib/supabase/client';

export type BusinessProfile = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  regionId: string;
  registrationStatus: 'pending' | 'approved' | 'rejected';
};

export type BusinessJob = {
  id: string;
  title: string;
  description: string;
  jobType: string;
  salaryRange: string | null;
  createdAt: string;
};

export type BusinessCampaign = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
};

export async function fetchBusinessCampaigns(businessId: string): Promise<BusinessCampaign[]> {
  const { data } = await supabase
    .from('business_campaigns')
    .select('id, title, description, image_url, starts_at, ends_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    imageUrl: c.image_url,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
  }));
}

export type BusinessEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  locationName: string | null;
  coverUrl: string | null;
};

export async function fetchBusinessJobs(businessId: string): Promise<BusinessJob[]> {
  const { data } = await supabase
    .from('job_listings')
    .select('id, title, description, job_type, salary_range, created_at')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  return (data ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    description: j.description,
    jobType: j.job_type,
    salaryRange: j.salary_range,
    createdAt: j.created_at,
  }));
}

export async function fetchBusinessEvents(organizerId: string): Promise<BusinessEvent[]> {
  const { data } = await supabase
    .from('events')
    .select('id, title, description, starts_at, location_name, cover_url')
    .eq('organizer_id', organizerId)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(10);

  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.starts_at,
    locationName: e.location_name,
    coverUrl: e.cover_url,
  }));
}

export async function fetchBusinessByOwner(ownerId: string): Promise<BusinessProfile | null> {
  const { data } = await supabase
    .from('businesses')
    .select(
      'id, name, category, description, phone, website, address, district, logo_url, cover_url, is_verified, region_id, registration_status',
    )
    .eq('owner_id', ownerId)
    .eq('registration_status', 'approved')
    .maybeSingle();

  if (!data) return null;
  return mapBusinessRow(data);
}

export async function fetchBusinessRecordByOwner(ownerId: string): Promise<BusinessProfile | null> {
  const { data } = await supabase
    .from('businesses')
    .select(
      'id, name, category, description, phone, website, address, district, logo_url, cover_url, is_verified, region_id, registration_status',
    )
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!data) return null;
  return mapBusinessRow(data);
}

export async function fetchBusinessIdentitiesByOwnerIds(
  ownerIds: string[],
): Promise<Map<string, BusinessProfile>> {
  if (!ownerIds.length) return new Map();

  const { data } = await supabase
    .from('businesses')
    .select(
      'owner_id, id, name, category, description, phone, website, address, district, logo_url, cover_url, is_verified, region_id, registration_status',
    )
    .in('owner_id', ownerIds)
    .eq('registration_status', 'approved');

  const map = new Map<string, BusinessProfile>();
  for (const row of data ?? []) {
    map.set(row.owner_id, mapBusinessRow(row));
  }
  return map;
}

function mapBusinessRow(row: {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  logo_url: string | null;
  cover_url?: string | null;
  is_verified: boolean;
  region_id: string;
  registration_status: string;
}): BusinessProfile {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    phone: row.phone,
    website: row.website,
    address: row.address,
    district: row.district,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url ?? null,
    isVerified: row.is_verified,
    regionId: row.region_id,
    registrationStatus: row.registration_status as BusinessProfile['registrationStatus'],
  };
}
