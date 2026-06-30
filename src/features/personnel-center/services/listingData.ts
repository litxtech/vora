import { distanceKm } from '@/features/map/utils/geo';
import type {
  CreateJobInput,
  CreateStaffInput,
  JobListingDetail,
  JobSeekerListing,
  JobType,
  ListingFilters,
  PersonnelListing,
  SalaryType,
  StaffListingDetail,
  UpdateJobInput,
  UpdateStaffInput,
} from '@/features/personnel-center/types';
import { enrichListingsWithApplicationStats } from '@/features/personnel-center/services/listingApplicationStats';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';
import { resolveEmployerDisplayName } from '@/features/personnel-center/utils/employerDisplayName';

type BusinessJoin = { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;

type JobRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  salary_range: string | null;
  housing_provided: boolean;
  meal_provided: boolean;
  district: string | null;
  location_label: string | null;
  is_urgent: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  workplace_media_urls?: string[];
  employer_display_name?: string | null;
  businesses: BusinessJoin;
};

type StaffRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  salary_range: string | null;
  housing_provided: boolean;
  meal_provided: boolean;
  district: string | null;
  location_label: string | null;
  is_urgent: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  businesses: BusinessJoin;
};

function businessInfo(row: { businesses: BusinessJoin }): { name: string | null; phone: string | null } {
  const b = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return { name: b?.name ?? null, phone: b?.phone ?? null };
}

function mapJobRow(row: JobRow, center?: { latitude: number; longitude: number }): PersonnelListing {
  const business = businessInfo(row);
  const listing: PersonnelListing = {
    id: row.id,
    type: 'job',
    ownerId: row.author_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type as PersonnelListing['jobType'],
    salaryRange: row.salary_range,
    housingProvided: row.housing_provided,
    mealProvided: row.meal_provided ?? false,
    district: row.district,
    locationLabel: row.location_label,
    businessName: resolveEmployerDisplayName(row.employer_display_name, business.name),
    phone: business.phone,
    isUrgent: row.is_urgent,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

function mapStaffRow(row: StaffRow, center?: { latitude: number; longitude: number }): PersonnelListing {
  const business = businessInfo(row);
  const listing: PersonnelListing = {
    id: row.id,
    type: 'staff',
    ownerId: row.author_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type as PersonnelListing['jobType'],
    salaryRange: row.salary_range,
    housingProvided: row.housing_provided ?? false,
    mealProvided: row.meal_provided ?? false,
    district: row.district,
    locationLabel: row.location_label,
    businessName: business.name,
    phone: business.phone,
    isUrgent: row.is_urgent,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

function applyListingFilters(listings: PersonnelListing[], filters?: ListingFilters): PersonnelListing[] {
  let result = listings;

  if (filters?.district) {
    result = result.filter((l) => l.district === filters.district);
  }
  if (filters?.jobType) {
    result = result.filter((l) => l.jobType === filters.jobType);
  }
  if (filters?.housingProvided != null) {
    result = result.filter((l) => l.housingProvided === filters.housingProvided);
  }
  if (filters?.urgentOnly) {
    result = result.filter((l) => l.isUrgent);
  }
  if (filters?.center && filters.radiusKm) {
    result = result.filter(
      (l) =>
        l.distanceKm != null &&
        l.distanceKm <= filters.radiusKm!,
    );
  }

  if (filters?.center) {
    result.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return result;
}

const JOB_SELECT = `
  id, author_id, title, description, job_type, salary_range, housing_provided, meal_provided,
  district, location_label, is_urgent, latitude, longitude, created_at, workplace_media_urls,
  employer_display_name,
  businesses (name, phone)
`;

const STAFF_SELECT = `
  id, author_id, title, description, job_type, salary_range, housing_provided, meal_provided,
  district, location_label, is_urgent, latitude, longitude, created_at,
  businesses (name, phone)
`;

export async function fetchJobListings(filters?: ListingFilters): Promise<PersonnelListing[]> {
  let query = supabase
    .from('job_listings')
    .select(JOB_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);

  if (filters?.regionId) query = query.eq('region_id', filters.regionId);

  const { data } = await query;
  const center = filters?.center;
  const listings = ((data ?? []) as unknown as JobRow[]).map((row) => mapJobRow(row, center));
  const filtered = applyListingFilters(listings, filters);
  await enrichListingsWithApplicationStats(filtered);
  return filtered;
}

export async function fetchStaffListings(filters?: ListingFilters): Promise<PersonnelListing[]> {
  let query = supabase
    .from('staff_requests')
    .select(STAFF_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);

  if (filters?.regionId) query = query.eq('region_id', filters.regionId);

  const { data } = await query;
  const center = filters?.center;
  const listings = ((data ?? []) as unknown as StaffRow[]).map((row) => mapStaffRow(row, center));
  const filtered = applyListingFilters(listings, filters);
  await enrichListingsWithApplicationStats(filtered);
  return filtered;
}

export async function fetchRecentListings(filters?: ListingFilters): Promise<PersonnelListing[]> {
  const [jobs, staff] = await Promise.all([fetchJobListings(filters), fetchStaffListings(filters)]);
  return [...jobs, ...staff].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchUrgentListings(filters?: ListingFilters): Promise<PersonnelListing[]> {
  const merged = await fetchRecentListings({ ...filters, urgentOnly: true });
  return merged.filter((l) => l.isUrgent);
}

export async function fetchJobSeekers(filters?: ListingFilters): Promise<JobSeekerListing[]> {
  let query = supabase
    .from('job_seekers')
    .select(
      `id, user_id, title, occupation, experience_years, skills, is_ready, phone_visible,
       district, description, latitude, longitude, created_at,
       profiles!job_seekers_user_id_fkey (username, full_name)`,
    )
    .eq('status', 'published')
    .eq('is_visible_on_map', true)
    .order('created_at', { ascending: false })
    .limit(60);

  if (filters?.regionId) query = query.eq('region_id', filters.regionId);
  if (filters?.district) query = query.eq('district', filters.district);

  const { data } = await query;
  const center = filters?.center;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const seeker: JobSeekerListing = {
      id: row.id,
      userId: row.user_id,
      displayName: profile?.full_name ?? profile?.username ?? null,
      title: row.title,
      occupation: row.occupation,
      experienceYears: row.experience_years,
      skills: row.skills ?? [],
      isReady: row.is_ready ?? false,
      phoneVisible: row.phone_visible ?? false,
      district: row.district,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
    };

    if (center && row.latitude != null && row.longitude != null) {
      seeker.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
    }

    return seeker;
  });
}

export async function fetchMyBusiness(ownerId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, region_id, district, registration_status, latitude, longitude')
    .eq('owner_id', ownerId)
    .maybeSingle();
  return data;
}

export async function createJobListing(input: CreateJobInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('job_listings')
    .insert({
      author_id: input.authorId,
      business_id: input.businessId,
      employer_display_name: input.employerDisplayName?.trim() || null,
      region_id: input.regionId,
      title: input.title,
      description: input.description,
      job_type: input.jobType,
      salary_range: input.salaryRange,
      salary_type: input.salaryType,
      district: input.district,
      housing_provided: input.housingProvided,
      meal_provided: input.mealProvided,
      experience_required: input.experienceRequired,
      start_date: input.startDate,
      is_urgent: input.isUrgent,
      workplace_media_urls: input.workplaceMediaUrls ?? [],
      status: 'published',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  if (!data) return { id: null, error: 'İlan oluşturulamadı.' };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_job_listing_location', {
      listing_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id, error: null };
}

export async function createStaffRequest(input: CreateStaffInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('staff_requests')
    .insert({
      author_id: input.authorId,
      business_id: input.businessId,
      region_id: input.regionId,
      title: input.title,
      description: input.description,
      positions: input.positions,
      positions_count: input.positionsCount,
      job_type: input.jobType,
      salary_range: input.salaryRange,
      district: input.district,
      housing_provided: input.housingProvided,
      meal_provided: input.mealProvided,
      is_urgent: input.isUrgent,
      needed_by: input.neededBy,
      status: 'published',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  if (!data) return { id: null, error: 'Talep oluşturulamadı.' };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_staff_request_location', {
      request_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id, error: null };
}

type JobDetailRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  salary_range: string | null;
  salary_type: string;
  housing_provided: boolean;
  meal_provided: boolean;
  experience_required: string | null;
  is_urgent: boolean;
  district: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  status: string;
  view_count: number;
  created_at: string;
  workplace_media_urls: string[];
  employer_display_name: string | null;
  businesses:
    | { name: string | null; phone: string | null; address: string | null }
    | { name: string | null; phone: string | null; address: string | null }[]
    | null;
};

function mapJobDetailRow(row: JobDetailRow): JobListingDetail {
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type as JobType,
    salaryRange: row.salary_range,
    salaryType: row.salary_type as SalaryType,
    district: row.district,
    locationLabel: row.location_label,
    housingProvided: row.housing_provided,
    mealProvided: row.meal_provided,
    experienceRequired: row.experience_required,
    isUrgent: row.is_urgent,
    status: row.status,
    employerDisplayName: row.employer_display_name,
    businessName: resolveEmployerDisplayName(row.employer_display_name, business?.name ?? null),
    businessPhone: business?.phone ?? null,
    businessAddress: business?.address ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    regionId: row.region_id,
    createdAt: row.created_at,
    viewCount: row.view_count ?? 0,
    workplaceMediaUrls: row.workplace_media_urls ?? [],
  };
}

const JOB_DETAIL_SELECT = `
  id, author_id, title, description, job_type, salary_range, salary_type,
  housing_provided, meal_provided, experience_required, is_urgent,
  district, location_label, latitude, longitude, region_id, status, view_count, created_at,
  workplace_media_urls, employer_display_name,
  businesses (name, phone, address)
`;

export async function fetchJobListingDetail(id: string): Promise<JobListingDetail | null> {
  const { data } = await supabase
    .from('job_listings')
    .select(JOB_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (data) {
    await supabase.rpc('increment_job_view_count', { listing_id: id });
  }

  const row = data as JobDetailRow | null;
  return row ? mapJobDetailRow(row) : null;
}

export async function fetchJobListingForEdit(
  id: string,
  authorId: string,
): Promise<JobListingDetail | null> {
  const { data } = await supabase
    .from('job_listings')
    .select(JOB_DETAIL_SELECT)
    .eq('id', id)
    .eq('author_id', authorId)
    .neq('status', 'removed')
    .maybeSingle();

  const row = data as JobDetailRow | null;
  return row ? mapJobDetailRow(row) : null;
}

export async function updateJobListing(
  id: string,
  authorId: string,
  input: UpdateJobInput,
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (input.employerDisplayName !== undefined) {
    payload.employer_display_name = input.employerDisplayName?.trim() || null;
  }
  if (input.title != null) payload.title = input.title.trim();
  if (input.description != null) payload.description = input.description.trim();
  if (input.jobType != null) payload.job_type = input.jobType;
  if (input.salaryRange !== undefined) payload.salary_range = input.salaryRange;
  if (input.salaryType != null) payload.salary_type = input.salaryType;
  if (input.district !== undefined) payload.district = input.district;
  if (input.housingProvided != null) payload.housing_provided = input.housingProvided;
  if (input.mealProvided != null) payload.meal_provided = input.mealProvided;
  if (input.experienceRequired !== undefined) payload.experience_required = input.experienceRequired;
  if (input.isUrgent != null) payload.is_urgent = input.isUrgent;
  if (input.workplaceMediaUrls != null) payload.workplace_media_urls = input.workplaceMediaUrls;

  const { error } = await supabase
    .from('job_listings')
    .update(payload)
    .eq('id', id)
    .eq('author_id', authorId)
    .in('status', ['published', 'draft']);

  return { error: supabaseErrorMessage(error) };
}

export async function removeJobListing(
  id: string,
  _authorId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('remove_own_job_listing', {
    p_listing_id: id,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  if (!result?.error) {
    notifyMapMarkerRemovedBySource('jobs', id);
  }
  return { error: result?.error ?? null };
}

type StaffDetailRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  positions: string[];
  positions_count: number | null;
  job_type: string;
  salary_range: string | null;
  housing_provided: boolean;
  meal_provided: boolean;
  is_urgent: boolean;
  needed_by: string | null;
  district: string | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  status: string;
  created_at: string;
  businesses:
    | { name: string | null; phone: string | null; address: string | null }
    | { name: string | null; phone: string | null; address: string | null }[]
    | null;
};

function mapStaffDetailRow(row: StaffDetailRow): StaffListingDetail {
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    positions: row.positions ?? [],
    positionsCount: row.positions_count,
    jobType: row.job_type as JobType,
    salaryRange: row.salary_range,
    district: row.district,
    locationLabel: row.location_label,
    housingProvided: row.housing_provided,
    mealProvided: row.meal_provided,
    isUrgent: row.is_urgent,
    neededBy: row.needed_by,
    status: row.status,
    businessName: business?.name ?? null,
    businessPhone: business?.phone ?? null,
    businessAddress: business?.address ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    regionId: row.region_id,
    createdAt: row.created_at,
  };
}

const STAFF_DETAIL_SELECT = `
  id, author_id, title, description, positions, positions_count, job_type, salary_range,
  housing_provided, meal_provided, is_urgent, needed_by,
  district, location_label, latitude, longitude, region_id, status, created_at,
  businesses (name, phone, address)
`;

export async function fetchStaffListingDetail(id: string): Promise<StaffListingDetail | null> {
  const { data } = await supabase
    .from('staff_requests')
    .select(STAFF_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (data) {
    await supabase.rpc('increment_staff_view_count', { p_request_id: id });
  }

  const row = data as StaffDetailRow | null;
  return row ? mapStaffDetailRow(row) : null;
}

export async function fetchStaffListingForEdit(
  id: string,
  authorId: string,
): Promise<StaffListingDetail | null> {
  const { data } = await supabase
    .from('staff_requests')
    .select(STAFF_DETAIL_SELECT)
    .eq('id', id)
    .eq('author_id', authorId)
    .neq('status', 'removed')
    .maybeSingle();

  const row = data as StaffDetailRow | null;
  return row ? mapStaffDetailRow(row) : null;
}

export async function updateStaffRequest(
  id: string,
  authorId: string,
  input: UpdateStaffInput,
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (input.title != null) payload.title = input.title.trim();
  if (input.description != null) payload.description = input.description.trim();
  if (input.positions != null) payload.positions = input.positions;
  if (input.positionsCount !== undefined) payload.positions_count = input.positionsCount;
  if (input.jobType != null) payload.job_type = input.jobType;
  if (input.salaryRange !== undefined) payload.salary_range = input.salaryRange;
  if (input.district !== undefined) payload.district = input.district;
  if (input.housingProvided != null) payload.housing_provided = input.housingProvided;
  if (input.mealProvided != null) payload.meal_provided = input.mealProvided;
  if (input.isUrgent != null) payload.is_urgent = input.isUrgent;
  if (input.neededBy !== undefined) payload.needed_by = input.neededBy;

  const { error } = await supabase
    .from('staff_requests')
    .update(payload)
    .eq('id', id)
    .eq('author_id', authorId)
    .in('status', ['published', 'draft']);

  return { error: supabaseErrorMessage(error) };
}

export async function removeStaffRequest(
  id: string,
  _authorId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('remove_own_staff_request', {
    p_request_id: id,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  if (!result?.error) {
    notifyMapMarkerRemovedBySource('staff', id);
  }
  return { error: result?.error ?? null };
}

export async function fillJobListing(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('fill_own_job_listing', {
    p_listing_id: id,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  if (!result?.error) {
    notifyMapMarkerRemovedBySource('jobs', id);
  }
  return { error: result?.error ?? null };
}

export async function fillStaffRequest(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('fill_own_staff_request', {
    p_request_id: id,
  });

  if (error) return { error: supabaseErrorMessage(error)! };

  const result = data as { error?: string; ok?: boolean } | null;
  if (!result?.error) {
    notifyMapMarkerRemovedBySource('staff', id);
  }
  return { error: result?.error ?? null };
}
