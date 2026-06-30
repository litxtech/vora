import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import type { FeedAuthor, FeedCategory, FeedItem } from '@/features/feed/types';
import { resolveEmployerDisplayName } from '@/features/personnel-center/utils/employerDisplayName';
import { supabase } from '@/lib/supabase/client';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: GenderId | null;
  account_type?: 'personal' | 'business';
  account_status?: FeedAuthor['accountStatus'];
  hidden_badges?: string[] | null;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  const accountStatus = profile?.account_status ?? 'active';
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: sanitizeDisplayName(profile?.full_name ?? null, profile?.username ?? null, accountStatus),
    avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
    role: profile?.role ?? 'user',
    isVerified: isHiddenPublicAccount(accountStatus) ? false : (profile?.is_verified ?? false),
    isPlatformCharm: resolvePlatformCharm(profile?.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(profile?.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(profile?.is_platform_supporter, accountStatus),
    hiddenBadges: resolveHiddenBadges(profile?.hidden_badges, accountStatus),
    gender: resolveAuthorGender(profile?.gender, accountStatus),
    accountType: profile?.account_type ?? 'personal',
    accountStatus,
  };
}

const CATEGORY_MAP: Record<string, FeedCategory> = {
  job: 'job',
  business: 'business',
  event: 'event',
  lost_found: 'lost_found',
};

export async function fetchUnifiedItems(
  regionId: string | null,
  category: FeedCategory,
  district: string | null,
): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  const shouldFetch = (cat: FeedCategory) => category === 'all' || category === cat;

  if (shouldFetch('job')) {
    let jobQuery = supabase
      .from('job_listings')
      .select(
        `id, title, description, salary_range, job_type, housing_provided, meal_provided, is_urgent,
         district, location_label, latitude, longitude, created_at, author_id, region_id, workplace_media_urls,
         employer_display_name,
         businesses (name, latitude, longitude),
         profiles!job_listings_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (regionId) jobQuery = jobQuery.eq('region_id', regionId);

    const { data } = await jobQuery;

    type JobRow = {
      id: string;
      title: string;
      description: string;
      salary_range: string | null;
      job_type: string;
      housing_provided: boolean;
      meal_provided: boolean;
      is_urgent: boolean;
      district: string | null;
      location_label: string | null;
      latitude: number | null;
      longitude: number | null;
      created_at: string;
      author_id: string;
      region_id: string;
      workplace_media_urls: string[];
      employer_display_name: string | null;
      businesses: { name: string | null; latitude: number | null; longitude: number | null } | { name: string | null; latitude: number | null; longitude: number | null }[] | null;
      profiles: ProfileRow | ProfileRow[] | null;
    };

    for (const row of (data ?? []) as unknown as JobRow[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      const latitude = row.latitude ?? business?.latitude ?? null;
      const longitude = row.longitude ?? business?.longitude ?? null;
      items.push({
        id: `job-${row.id}`,
        sourceType: 'job',
        sourceId: row.id,
        author: toAuthor(profile as ProfileRow | null, row.author_id),
        title: row.title,
        content: row.description,
        mediaUrls: row.workplace_media_urls ?? [],
        category: 'job',
        regionId: row.region_id,
        district: row.district,
        locationLabel: row.location_label ?? business?.name ?? null,
        latitude,
        longitude,
        likeCount: 0,
        commentCount: 0,
        quoteCount: 0,
        saveCount: 0,
        viewCount: 0,
        createdAt: row.created_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: null,
        isFeatured: row.is_urgent,
        jobType: row.job_type,
        jobSalaryRange: row.salary_range,
        jobIsUrgent: row.is_urgent,
        jobHousingProvided: row.housing_provided,
        jobMealProvided: row.meal_provided,
        businessName: resolveEmployerDisplayName(row.employer_display_name, business?.name ?? null),
      });
    }
  }

  if (shouldFetch('business')) {
    let businessQuery = supabase
      .from('businesses')
      .select(
        `id, name, description, category, region_id, logo_url, created_at, owner_id, is_verified, registration_status,
         profiles!businesses_owner_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
      )
      .eq('registration_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    if (regionId) businessQuery = businessQuery.eq('region_id', regionId);

    const { data } = await businessQuery;

    type BusinessRow = {
      id: string;
      name: string;
      description: string | null;
      category: string;
      region_id: string;
      logo_url: string | null;
      created_at: string;
      owner_id: string;
      is_verified: boolean;
      registration_status: string;
      profiles: ProfileRow | ProfileRow[] | null;
    };

    for (const row of (data ?? []) as unknown as BusinessRow[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const baseAuthor = toAuthor(profile, row.owner_id);

      items.push({
        id: `business-${row.id}`,
        sourceType: 'business',
        sourceId: row.id,
        author: {
          ...baseAuthor,
          fullName: row.name,
          displayName: row.name,
          avatarUrl: row.logo_url ?? baseAuthor.avatarUrl,
          accountType: 'business',
          isVerified: false,
          isBusinessVerified: row.is_verified,
        },
        title: row.name,
        content: row.description ?? row.category,
        mediaUrls: row.logo_url ? [row.logo_url] : [],
        category: 'business',
        regionId: row.region_id,
        district: null,
        locationLabel: row.category,
        latitude: null,
        longitude: null,
        likeCount: 0,
        commentCount: 0,
        quoteCount: 0,
        saveCount: 0,
        viewCount: 0,
        createdAt: row.created_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: null,
      });
    }
  }

  if (category === 'event') {
    let eventQuery = supabase
      .from('events')
      .select(
        `id, title, description, location_name, cover_url, created_at, organizer_id, region_id,
         starts_at, ends_at, is_featured, is_sponsored,
         profiles!events_organizer_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
      )
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('is_sponsored', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (regionId) eventQuery = eventQuery.eq('region_id', regionId);

    const { data } = await eventQuery;

    type EventRow = {
      id: string;
      title: string;
      description: string;
      location_name: string | null;
      cover_url: string | null;
      created_at: string;
      starts_at: string;
      ends_at: string | null;
      is_featured: boolean;
      is_sponsored: boolean;
      organizer_id: string;
      region_id: string;
      profiles: ProfileRow | ProfileRow[] | null;
    };

    for (const row of (data ?? []) as unknown as EventRow[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      items.push({
        id: `event-${row.id}`,
        sourceType: 'event',
        sourceId: row.id,
        author: toAuthor(profile as ProfileRow | null, row.organizer_id),
        title: row.title,
        content: row.description,
        mediaUrls: row.cover_url ? [row.cover_url] : [],
        category: 'event',
        regionId: row.region_id,
        district: null,
        locationLabel: row.location_name,
        latitude: null,
        longitude: null,
        likeCount: 0,
        commentCount: 0,
        quoteCount: 0,
        saveCount: 0,
        viewCount: 0,
        createdAt: row.starts_at ?? row.created_at,
        endsAt: row.ends_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: null,
        isFeatured: row.is_featured,
        isSponsored: row.is_sponsored,
      });
    }
  }

  // Ana akışta kayıp ilanları yalnızca üstteki avatar carousel'de gösterilir.
  if (shouldFetch('lost_found') && category !== 'all') {
    let lostQuery = supabase
      .from('lost_items')
        .select(
          `id, title, description, item_type, category, media_urls, is_urgent,
           latitude, longitude, district, location_name, created_at, author_id, region_id,
           profiles!lost_items_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
        )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (regionId) lostQuery = lostQuery.eq('region_id', regionId);
    if (district) lostQuery = lostQuery.eq('district', district);

    const { data } = await lostQuery;

    type LostRow = {
      id: string;
      title: string;
      description: string;
      item_type: 'lost' | 'found';
      category: string;
      media_urls: string[];
      is_urgent: boolean;
      latitude: number | null;
      longitude: number | null;
      district: string | null;
      location_name: string | null;
      created_at: string;
      author_id: string;
      region_id: string;
      profiles: ProfileRow | ProfileRow[] | null;
    };

    for (const row of (data ?? []) as unknown as LostRow[]) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      items.push({
        id: `lost-${row.id}`,
        sourceType: 'lost_found',
        sourceId: row.id,
        author: toAuthor(profile as ProfileRow | null, row.author_id),
        title: row.title,
        content: row.description,
        mediaUrls: row.media_urls ?? [],
        category: 'lost_found',
        regionId: row.region_id,
        district: row.district,
        locationLabel: row.location_name,
        latitude: row.latitude,
        longitude: row.longitude,
        likeCount: 0,
        commentCount: 0,
        quoteCount: 0,
        saveCount: 0,
        viewCount: 0,
        createdAt: row.created_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: null,
        isFeatured: row.is_urgent,
        lostItemType: row.item_type,
        lostItemCategory: row.category,
      });
    }
  }

  if (district) {
    return items.filter((item) => item.district === district);
  }

  void CATEGORY_MAP;
  return items;
}
