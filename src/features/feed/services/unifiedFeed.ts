import type { FeedAuthor, FeedCategory, FeedItem } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.is_verified ?? false,
  };
}

const CATEGORY_MAP: Record<string, FeedCategory> = {
  job: 'job',
  business: 'business',
  event: 'event',
  lost_found: 'lost_found',
};

export async function fetchUnifiedItems(
  regionId: string,
  category: FeedCategory,
  district: string | null,
): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  const shouldFetch = (cat: FeedCategory) => category === 'all' || category === cat;

  if (shouldFetch('job')) {
    const { data } = await supabase
      .from('job_listings')
      .select(
        `id, title, description, salary_range, location_label, latitude, longitude, created_at, author_id, region_id,
         businesses (name, latitude, longitude),
         profiles!job_listings_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
      )
      .eq('region_id', regionId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    type JobRow = {
      id: string;
      title: string;
      description: string;
      salary_range: string | null;
      location_label: string | null;
      latitude: number | null;
      longitude: number | null;
      created_at: string;
      author_id: string;
      region_id: string;
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
        mediaUrls: [],
        category: 'job',
        regionId: row.region_id,
        district: null,
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
      });
    }
  }

  if (shouldFetch('business')) {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, description, category, region_id, logo_url, created_at, owner_id')
      .eq('region_id', regionId)
      .order('created_at', { ascending: false })
      .limit(20);

    type BusinessRow = {
      id: string;
      name: string;
      description: string | null;
      category: string;
      region_id: string;
      logo_url: string | null;
      created_at: string;
      owner_id: string;
    };

    for (const row of (data ?? []) as unknown as BusinessRow[]) {
      items.push({
        id: `business-${row.id}`,
        sourceType: 'business',
        sourceId: row.id,
        author: {
          id: row.owner_id,
          username: 'isletme',
          fullName: row.name,
          avatarUrl: row.logo_url,
          role: 'user',
          isVerified: false,
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

  if (shouldFetch('event')) {
    const { data } = await supabase
      .from('events')
      .select(
        `id, title, description, location_name, cover_url, created_at, organizer_id, region_id,
         profiles!events_organizer_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
      )
      .eq('region_id', regionId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    type EventRow = {
      id: string;
      title: string;
      description: string;
      location_name: string | null;
      cover_url: string | null;
      created_at: string;
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
        createdAt: row.created_at,
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        quotedPost: null,
      });
    }
  }

  if (shouldFetch('lost_found')) {
    const { data } = await supabase
      .from('lost_items')
      .select(
        `id, title, description, item_type, media_urls, created_at, author_id, region_id,
         profiles!lost_items_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
      )
      .eq('region_id', regionId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    type LostRow = {
      id: string;
      title: string;
      description: string;
      item_type: 'lost' | 'found';
      media_urls: string[];
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
        district: null,
        locationLabel: row.item_type === 'lost' ? 'Kayıp' : 'Buluntu',
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

  void district;
  void CATEGORY_MAP;
  return items;
}
