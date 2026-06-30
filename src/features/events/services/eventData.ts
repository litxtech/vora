import { distanceKm } from '@/features/map/utils/geo';
import type {
  CreateEventInput,
  EventAttendee,
  EventEditRecord,
  EventListing,
  EventRsvpStatus,
  EventStats,
  UpdateEventInput,
} from '@/features/events/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { notifyMapMarkerRemovedBySource } from '@/features/map/services/mapMarkerSync';

type EventRow = {
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
  business_id: string | null;
  max_attendees: number | null;
  view_count: number;
  is_featured: boolean;
  is_sponsored: boolean;
  latitude: number | null;
  longitude: number | null;
  profiles: { username: string; full_name: string | null; avatar_url: string | null } | null;
  businesses: { name: string } | { name: string }[] | null;
};

function businessName(row: EventRow): string | null {
  const b = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return b?.name ?? null;
}

function mapEventRow(row: EventRow, counts?: { going: number; maybe: number }, myRsvp?: EventRsvpStatus | null, center?: { latitude: number; longitude: number }): EventListing {
  const listing: EventListing = {
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
    businessName: businessName(row),
    maxAttendees: row.max_attendees,
    viewCount: row.view_count,
    goingCount: counts?.going ?? 0,
    maybeCount: counts?.maybe ?? 0,
    isFeatured: row.is_featured,
    isSponsored: row.is_sponsored,
    latitude: row.latitude,
    longitude: row.longitude,
    myRsvp: myRsvp ?? null,
  };

  if (center && row.latitude != null && row.longitude != null) {
    listing.distanceKm = distanceKm(center, { latitude: row.latitude, longitude: row.longitude });
  }

  return listing;
}

const EVENT_SELECT = `
  id, title, description, category, map_category, starts_at, ends_at, location_name,
  cover_url, region_id, organizer_id, business_id, max_attendees, view_count,
  is_featured, is_sponsored, latitude, longitude,
  profiles!events_organizer_id_fkey (username, full_name, avatar_url),
  businesses (name)
`;

async function fetchRsvpCounts(eventIds: string[]): Promise<Map<string, { going: number; maybe: number }>> {
  if (eventIds.length === 0) return new Map();

  const { data } = await supabase
    .from('event_rsvps')
    .select('event_id, status')
    .in('event_id', eventIds);

  const map = new Map<string, { going: number; maybe: number }>();
  for (const row of data ?? []) {
    const current = map.get(row.event_id) ?? { going: 0, maybe: 0 };
    if (row.status === 'going') current.going += 1;
    if (row.status === 'maybe') current.maybe += 1;
    map.set(row.event_id, current);
  }
  return map;
}

async function fetchMyRsvps(userId: string, eventIds: string[]): Promise<Map<string, EventRsvpStatus>> {
  if (eventIds.length === 0) return new Map();

  const { data } = await supabase
    .from('event_rsvps')
    .select('event_id, status')
    .eq('user_id', userId)
    .in('event_id', eventIds);

  return new Map((data ?? []).map((r) => [r.event_id, r.status as EventRsvpStatus]));
}

async function enrichEvents(rows: EventRow[], userId?: string | null, center?: { latitude: number; longitude: number }): Promise<EventListing[]> {
  const ids = rows.map((r) => r.id);
  const [counts, myRsvps] = await Promise.all([
    fetchRsvpCounts(ids),
    userId ? fetchMyRsvps(userId, ids) : Promise.resolve(new Map()),
  ]);

  return rows.map((row) =>
    mapEventRow(row, counts.get(row.id), myRsvps.get(row.id), center),
  );
}

export async function fetchUpcomingEvents(regionId: string, userId?: string | null): Promise<EventListing[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('region_id', regionId)
    .gte('starts_at', new Date().toISOString())
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })
    .limit(50);

  if (error || !data) return [];
  return enrichEvents(data as unknown as EventRow[], userId);
}

export async function fetchNearbyEvents(
  regionId: string,
  center: { latitude: number; longitude: number },
  radiusKm: number,
  userId?: string | null,
): Promise<EventListing[]> {
  const events = await fetchUpcomingEvents(regionId, userId);
  return events
    .filter((e) => e.distanceKm != null && e.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

export async function fetchMyEvents(organizerId: string): Promise<EventListing[]> {
  const { data } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('organizer_id', organizerId)
    .order('starts_at', { ascending: false })
    .limit(50);

  if (!data) return [];
  return enrichEvents(data as unknown as EventRow[], organizerId);
}

export async function fetchAttendingEvents(userId: string): Promise<EventListing[]> {
  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .in('status', ['going', 'maybe']);

  const ids = (rsvps ?? []).map((r) => r.event_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .in('id', ids)
    .eq('status', 'published')
    .order('starts_at', { ascending: true });

  if (!data) return [];
  return enrichEvents(data as unknown as EventRow[], userId);
}

export async function fetchFollowedEvents(userId: string): Promise<EventListing[]> {
  const { data: follows } = await supabase.from('event_follows').select('event_id').eq('user_id', userId);
  const ids = (follows ?? []).map((f) => f.event_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .in('id', ids)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (!data) return [];
  return enrichEvents(data as unknown as EventRow[], userId);
}

export async function createEvent(input: CreateEventInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      organizer_id: input.organizerId,
      business_id: input.businessId,
      region_id: input.regionId,
      title: input.title,
      description: input.description,
      category: input.category,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location_name: input.locationName,
      max_attendees: input.maxAttendees,
      cover_url: input.coverUrl,
      ticket_type: input.ticketType ?? 'free',
      ticket_price_cents: input.ticketType === 'paid' ? input.ticketPriceCents : null,
      community_id: input.communityId ?? null,
      status: 'published',
    })
    .select('id')
    .single();

  if (error) return { id: null, error: supabaseErrorMessage(error)! };
  if (!data) return { id: null, error: 'Etkinlik oluşturulamadı.' };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_event_location', {
      p_event_id: data.id,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { id: data.id, error: null };
}

export async function fetchEventForEdit(eventId: string, userId: string): Promise<EventEditRecord | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      `id, organizer_id, title, description, category, starts_at, ends_at, location_name,
       max_attendees, cover_url, ticket_type, ticket_price_cents, business_id, region_id`,
    )
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data || data.organizer_id !== userId) return null;

  return {
    id: data.id,
    organizerId: data.organizer_id,
    title: data.title,
    description: data.description,
    category: data.category as EventEditRecord['category'],
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    locationName: data.location_name,
    maxAttendees: data.max_attendees,
    coverUrl: data.cover_url,
    ticketType: (data.ticket_type as 'free' | 'paid') ?? 'free',
    ticketPriceCents: data.ticket_price_cents,
    businessId: data.business_id,
    regionId: data.region_id,
  };
}

export async function updateEvent(input: UpdateEventInput): Promise<{ error: string | null }> {
  const { data: existing, error: readError } = await supabase
    .from('events')
    .select('organizer_id')
    .eq('id', input.eventId)
    .maybeSingle();

  if (readError) return { error: supabaseErrorMessage(readError)! };
  if (!existing || existing.organizer_id !== input.organizerId) {
    return { error: 'Bu etkinliği düzenleme yetkiniz yok.' };
  }

  const { error } = await supabase
    .from('events')
    .update({
      business_id: input.businessId,
      region_id: input.regionId,
      title: input.title,
      description: input.description,
      category: input.category,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location_name: input.locationName,
      max_attendees: input.maxAttendees,
      cover_url: input.coverUrl,
      ticket_type: input.ticketType ?? 'free',
      ticket_price_cents: input.ticketType === 'paid' ? input.ticketPriceCents : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.eventId)
    .eq('organizer_id', input.organizerId);

  if (error) return { error: supabaseErrorMessage(error)! };

  if (input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_event_location', {
      p_event_id: input.eventId,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { error: null };
}

export async function deleteEvent(
  eventId: string,
  organizerId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('organizer_id', organizerId);

  if (!error) {
    notifyMapMarkerRemovedBySource('events', eventId);
  }

  return { error: supabaseErrorMessage(error) };
}

export async function setEventRsvp(
  eventId: string,
  userId: string,
  status: EventRsvpStatus,
): Promise<{ error: string | null }> {
  if (status === 'not_going') {
    const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', userId);
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.from('event_rsvps').upsert(
    { event_id: eventId, user_id: userId, status },
    { onConflict: 'event_id,user_id' },
  );

  return { error: supabaseErrorMessage(error) };
}

export async function fetchEventRsvp(eventId: string, userId: string): Promise<EventRsvpStatus | null> {
  const { data } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  return (data?.status as EventRsvpStatus) ?? null;
}

export async function fetchEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const { data } = await supabase
    .from('event_rsvps')
    .select('user_id, status, profiles!event_rsvps_user_id_fkey (username, full_name, avatar_url)')
    .eq('event_id', eventId)
    .in('status', ['going', 'maybe'])
    .order('updated_at', { ascending: false });

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      username: profile?.username ?? '',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      status: row.status as EventRsvpStatus,
    };
  });
}

export async function fetchEventStats(eventId: string, organizerId: string, userId: string): Promise<EventStats | null> {
  if (userId !== organizerId) return null;

  const [{ data: event }, { count: going }, { count: maybe }, { count: notGoing }, { count: checkins }] =
    await Promise.all([
      supabase.from('events').select('view_count, map_view_count').eq('id', eventId).maybeSingle(),
      supabase.from('event_rsvps').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'going'),
      supabase.from('event_rsvps').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'maybe'),
      supabase.from('event_rsvps').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'not_going'),
      supabase.from('event_checkins').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);

  if (!event) return null;

  return {
    viewCount: event.view_count,
    mapViewCount: event.map_view_count,
    goingCount: going ?? 0,
    maybeCount: maybe ?? 0,
    notGoingCount: notGoing ?? 0,
    checkinCount: checkins ?? 0,
  };
}

export async function incrementEventView(
  eventId: string,
  source: 'detail' | 'map' = 'detail',
): Promise<boolean> {
  const { data } = await supabase.rpc('increment_event_view', { p_event_id: eventId, p_source: source });
  return data ?? false;
}

export async function fetchMyBusiness(ownerId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, region_id, district')
    .eq('owner_id', ownerId)
    .maybeSingle();
  return data;
}

export async function fetchCommunityEvents(
  communityId: string,
  userId?: string | null,
): Promise<EventListing[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('community_id', communityId)
    .eq('status', 'published')
    .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(30);

  if (error || !data) return [];
  return enrichEvents(data as unknown as EventRow[], userId);
}

export async function fetchEventConversationId(eventId: string): Promise<string | null> {
  const { data } = await supabase.from('events').select('conversation_id').eq('id', eventId).maybeSingle();
  return data?.conversation_id ?? null;
}
