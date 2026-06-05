import { DEMO_MAP_MARKERS, NEARBY_RADIUS_KM } from '@/features/map/constants';
import type { MapCoordinate, MapLayerId, MapMarker } from '@/features/map/types';
import { filterByRadius } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';

function withCoords<T extends { latitude: number | null; longitude: number | null }>(
  rows: T[],
): (T & { latitude: number; longitude: number })[] {
  return rows.filter(
    (row): row is T & { latitude: number; longitude: number } =>
      row.latitude != null && row.longitude != null,
  );
}

export async function fetchMapMarkers(): Promise<MapMarker[]> {
  const [incidents, posts, businesses, events, lostItems] = await Promise.all([
    supabase
      .from('incident_reports')
      .select('id, title, description, severity, latitude, longitude, created_at')
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('posts')
      .select('id, title, content, latitude, longitude, created_at')
      .eq('status', 'published')
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('businesses')
      .select('id, name, category, description, address, is_verified, latitude, longitude, created_at')
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('events')
      .select('id, title, description, location_name, starts_at, latitude, longitude, created_at')
      .eq('status', 'published')
      .not('latitude', 'is', null)
      .order('starts_at', { ascending: true })
      .limit(80),
    supabase
      .from('lost_items')
      .select('id, title, description, item_type, latitude, longitude, created_at')
      .eq('status', 'open')
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  const markers: MapMarker[] = [];

  for (const row of withCoords(incidents.data ?? [])) {
    markers.push({
      id: `incident-${row.id}`,
      sourceId: row.id,
      layer: 'incidents',
      title: row.title,
      subtitle: String(row.severity),
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { severity: row.severity },
    });
  }

  for (const row of withCoords(posts.data ?? [])) {
    markers.push({
      id: `post-${row.id}`,
      sourceId: row.id,
      layer: 'posts',
      title: row.title ?? 'Paylaşım',
      subtitle: 'Canlı akış',
      description: row.content,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
    });
  }

  for (const row of withCoords(businesses.data ?? [])) {
    markers.push({
      id: `business-${row.id}`,
      sourceId: row.id,
      layer: 'businesses',
      title: row.name,
      subtitle: row.category,
      description: row.description ?? row.address ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { verified: row.is_verified },
    });
  }

  for (const row of withCoords(events.data ?? [])) {
    markers.push({
      id: `event-${row.id}`,
      sourceId: row.id,
      layer: 'events',
      title: row.title,
      subtitle: row.location_name ?? 'Etkinlik',
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { startsAt: row.starts_at },
    });
  }

  for (const row of withCoords(lostItems.data ?? [])) {
    markers.push({
      id: `lost-${row.id}`,
      sourceId: row.id,
      layer: 'lost_found',
      title: row.title,
      subtitle: row.item_type === 'lost' ? 'Kayıp' : 'Buluntu',
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { itemType: row.item_type },
    });
  }

  if (markers.length === 0) return DEMO_MAP_MARKERS;
  return markers;
}

export function filterMapMarkers(
  markers: MapMarker[],
  enabledLayers: MapLayerId[],
  searchQuery: string,
  nearby?: { center: MapCoordinate; radiusKm?: number } | null,
): MapMarker[] {
  const query = searchQuery.trim().toLowerCase();
  let scoped = markers;

  if (nearby) {
    scoped = filterByRadius(markers, nearby.center, nearby.radiusKm ?? NEARBY_RADIUS_KM);
  }

  return scoped.filter((marker) => {
    if (!enabledLayers.includes(marker.layer)) return false;
    if (!query) return true;

    const haystack = [marker.title, marker.subtitle, marker.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function countByLayer(markers: MapMarker[]): Record<MapLayerId, number> {
  return markers.reduce(
    (acc, marker) => {
      acc[marker.layer] = (acc[marker.layer] ?? 0) + 1;
      return acc;
    },
    {
      incidents: 0,
      posts: 0,
      businesses: 0,
      events: 0,
      lost_found: 0,
    } as Record<MapLayerId, number>,
  );
}
