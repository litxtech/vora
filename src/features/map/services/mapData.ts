import { DEMO_MAP_MARKERS, emptyLayerCounts, JOB_TYPE_LABELS, POI_CATEGORY_LABELS } from '@/features/map/constants';
import type { MapCoordinate, MapLayerId, MapMarker } from '@/features/map/types';
import { filterByRadius } from '@/features/map/utils/geo';
import { supabase } from '@/lib/supabase/client';

type CoordsRow = {
  latitude: number | null;
  longitude: number | null;
};

type BusinessCoords = { latitude: number | null; longitude: number | null; name?: string | null };

function withCoords<T extends CoordsRow>(rows: T[]): (T & { latitude: number; longitude: number })[] {
  return rows.filter(
    (row): row is T & { latitude: number; longitude: number } =>
      row.latitude != null && row.longitude != null,
  );
}

function resolveCoords(
  row: CoordsRow & { businesses?: BusinessCoords | BusinessCoords[] | null },
): { latitude: number; longitude: number } | null {
  if (row.latitude != null && row.longitude != null) {
    return { latitude: row.latitude, longitude: row.longitude };
  }

  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  if (business?.latitude != null && business?.longitude != null) {
    return { latitude: business.latitude, longitude: business.longitude };
  }

  return null;
}

export async function fetchMapMarkers(): Promise<MapMarker[]> {
  const [incidents, posts, businesses, events, lostItems, jobs, staff, seekers, pois] =
    await Promise.all([
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
      supabase
        .from('job_listings')
        .select(
          `id, title, description, job_type, salary_range, housing_provided, location_label,
           latitude, longitude, created_at, business_id,
           businesses (name, latitude, longitude)`,
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('staff_requests')
        .select(
          `id, title, description, positions, salary_range, location_label,
           latitude, longitude, created_at, business_id,
           businesses (name, latitude, longitude)`,
        )
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('job_seekers')
        .select('id, title, occupation, experience_years, description, district, latitude, longitude, created_at')
        .eq('status', 'published')
        .eq('is_visible_on_map', true)
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('emergency_pois')
        .select('id, name, category, description, phone, is_24h, latitude, longitude, created_at')
        .not('latitude', 'is', null)
        .order('name', { ascending: true })
        .limit(120),
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

  type JobMapRow = {
    id: string;
    title: string;
    description: string;
    job_type: string;
    salary_range: string | null;
    housing_provided: boolean;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    businesses: BusinessCoords | BusinessCoords[] | null;
  };

  type StaffMapRow = {
    id: string;
    title: string;
    description: string;
    positions: string[];
    salary_range: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    businesses: BusinessCoords | BusinessCoords[] | null;
  };

  for (const row of (jobs.data ?? []) as unknown as JobMapRow[]) {
    const coords = resolveCoords(row);
    if (!coords) continue;
    const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    markers.push({
      id: `job-${row.id}`,
      sourceId: row.id,
      layer: 'jobs',
      title: row.title,
      subtitle: [business?.name, row.salary_range].filter(Boolean).join(' · ') || 'İş ilanı',
      description: row.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: row.created_at,
      meta: {
        jobType: row.job_type,
        salaryRange: row.salary_range,
        housingProvided: row.housing_provided,
      },
    });
  }

  for (const row of (staff.data ?? []) as unknown as StaffMapRow[]) {
    const coords = resolveCoords(row);
    if (!coords) continue;
    markers.push({
      id: `staff-${row.id}`,
      sourceId: row.id,
      layer: 'staff',
      title: row.title,
      subtitle: `${row.positions?.length ?? 0} pozisyon`,
      description: row.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      createdAt: row.created_at,
      meta: {
        positions: row.positions?.join(', '),
        salaryRange: row.salary_range,
      },
    });
  }

  for (const row of withCoords(seekers.data ?? [])) {
    markers.push({
      id: `seeker-${row.id}`,
      sourceId: row.id,
      layer: 'job_seekers',
      title: row.title,
      subtitle: [row.occupation, row.district].filter(Boolean).join(' · '),
      description: row.description ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { experienceYears: row.experience_years },
    });
  }

  for (const row of withCoords(pois.data ?? [])) {
    markers.push({
      id: `poi-${row.id}`,
      sourceId: row.id,
      layer: 'emergency_pois',
      title: row.name,
      subtitle: POI_CATEGORY_LABELS[row.category] ?? row.category,
      description: row.description ?? undefined,
      latitude: row.latitude,
      longitude: row.longitude,
      createdAt: row.created_at,
      meta: { category: row.category, is24h: row.is_24h, phone: row.phone },
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
    scoped = filterByRadius(markers, nearby.center, nearby.radiusKm ?? 15);
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
  return markers.reduce((acc, marker) => {
    acc[marker.layer] = (acc[marker.layer] ?? 0) + 1;
    return acc;
  }, emptyLayerCounts());
}

export function jobTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return JOB_TYPE_LABELS[value] ?? value;
}
