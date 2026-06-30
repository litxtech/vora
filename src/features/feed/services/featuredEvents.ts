import { isEventLiveNow } from '@/features/events/constants';
import { supabase } from '@/lib/supabase/client';
import type { EventListing } from '@/features/events/types';

const FEATURED_SELECT = `
  id, title, description, category, map_category, starts_at, ends_at, location_name,
  cover_url, region_id, organizer_id, business_id, max_attendees, view_count,
  is_featured, is_sponsored, latitude, longitude,
  profiles!events_organizer_id_fkey (username, full_name, avatar_url),
  businesses (name)
`;

type FeaturedRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  map_category: string;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  cover_url: string | null;
  region_id: string;
  organizer_id: string;
  max_attendees: number | null;
  view_count: number;
  is_featured: boolean;
  is_sponsored: boolean;
  latitude: number | null;
  longitude: number | null;
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null;
  businesses: { name: string } | { name: string }[] | null;
};

function mapFeatured(row: FeaturedRow): EventListing {
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as EventListing['category'],
    mapCategory: row.map_category as EventListing['mapCategory'],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name,
    coverUrl: row.cover_url,
    regionId: row.region_id,
    organizerId: row.organizer_id,
    organizerName: row.profiles?.full_name ?? row.profiles?.username ?? null,
    organizerAvatar: row.profiles?.avatar_url ?? null,
    businessName: business?.name ?? null,
    maxAttendees: row.max_attendees,
    viewCount: row.view_count,
    goingCount: 0,
    maybeCount: 0,
    isFeatured: row.is_featured,
    isSponsored: row.is_sponsored,
    latitude: row.latitude,
    longitude: row.longitude,
    myRsvp: null,
  };
}

export async function fetchFeedHeaderEvents(regionId: string | null, limit = 12): Promise<EventListing[]> {
  const liveCutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from('events')
    .select(FEATURED_SELECT)
    .eq('status', 'published');

  if (regionId) query = query.eq('region_id', regionId);

  const { data } = await query
    .gte('starts_at', liveCutoff)
    .order('is_sponsored', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .limit(limit * 2);

  const mapped = ((data ?? []) as unknown as FeaturedRow[]).map(mapFeatured);

  return mapped
    .filter(
      (event) =>
        new Date(event.startsAt).getTime() >= Date.now() ||
        isEventLiveNow(event.startsAt, event.endsAt),
    )
    .sort((a, b) => {
      const aLive = isEventLiveNow(a.startsAt, a.endsAt);
      const bLive = isEventLiveNow(b.startsAt, b.endsAt);
      if (aLive !== bLive) return aLive ? -1 : 1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    })
    .slice(0, limit);
}

export async function fetchFeaturedEvents(regionId: string | null, limit = 8): Promise<EventListing[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from('events')
    .select(FEATURED_SELECT)
    .eq('status', 'published');

  if (regionId) query = query.eq('region_id', regionId);

  const { data } = await query
    .gte('starts_at', now)
    .or('is_featured.eq.true,is_sponsored.eq.true')
    .order('is_sponsored', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .limit(limit);

  return ((data ?? []) as unknown as FeaturedRow[]).map(mapFeatured);
}

export async function fetchDiscoverEvents(regionId: string | null, limit = 6): Promise<EventListing[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from('events')
    .select(FEATURED_SELECT)
    .eq('status', 'published');

  if (regionId) query = query.eq('region_id', regionId);

  const { data } = await query
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(limit);

  return ((data ?? []) as unknown as FeaturedRow[]).map(mapFeatured);
}
