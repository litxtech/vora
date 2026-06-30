import type { MapLayerId } from '@/features/map/types';

const LAYER_MARKER_PREFIX: Record<MapLayerId, string> = {
  incidents: 'incident',
  posts: 'post',
  businesses: 'business',
  events: 'event',
  lost_found: 'lost',
  marketplace: 'marketplace',
  vora_needs: 'vora-need',
  vora_hizmetler: 'vora-hizmet',
  jobs: 'job',
  staff: 'staff',
  job_seekers: 'seeker',
  traffic: 'traffic',
  tourism: 'tourism',
  hotels: 'hotel',
};

export const MAP_REALTIME_TABLES = [
  'incident_reports',
  'posts',
  'traffic_reports',
  'events',
  'lost_items',
  'marketplace_listings',
  'vora_needs',
  'vora_service_requests',
  'vora_service_providers',
  'job_listings',
  'staff_requests',
  'job_seekers',
  'tourism_places',
  'hotel_listings',
] as const;

export type MapRealtimeTable = (typeof MAP_REALTIME_TABLES)[number];

export const TABLE_LAYER_MAP: Record<MapRealtimeTable, MapLayerId> = {
  incident_reports: 'incidents',
  posts: 'posts',
  traffic_reports: 'traffic',
  events: 'events',
  lost_items: 'lost_found',
  marketplace_listings: 'marketplace',
  vora_needs: 'vora_needs',
  vora_service_requests: 'vora_hizmetler',
  vora_service_providers: 'vora_hizmetler',
  job_listings: 'jobs',
  staff_requests: 'staff',
  job_seekers: 'job_seekers',
  tourism_places: 'tourism',
  hotel_listings: 'hotels',
};

export function buildMapMarkerId(layer: MapLayerId, sourceId: string): string {
  return `${LAYER_MARKER_PREFIX[layer]}-${sourceId}`;
}
