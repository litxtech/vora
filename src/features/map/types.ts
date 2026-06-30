export type MapLayerId =
  | 'incidents'
  | 'posts'
  | 'businesses'
  | 'events'
  | 'lost_found'
  | 'jobs'
  | 'staff'
  | 'job_seekers'
  | 'traffic'
  | 'tourism'
  | 'marketplace'
  | 'vora_needs'
  | 'vora_hizmetler'
  | 'hotels';

export type MapStyleId = 'standard' | 'dark' | 'light' | 'satellite';

export type ContentFollowType = 'event' | 'incident';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRouteSegment = {
  id: string;
  coordinates: MapCoordinate[];
  color?: string;
  outlineColor?: string;
  width?: number;
};

export type MapMarker = {
  id: string;
  sourceId: string;
  layer: MapLayerId;
  title: string;
  subtitle?: string;
  description?: string;
  latitude: number;
  longitude: number;
  createdAt?: string;
  isDemo?: boolean;
  /** Pin / küme temsilci görseli (avatar, logo, kapak) */
  avatarUrl?: string | null;
  mediaUrls?: string[];
  meta?: Record<string, string | number | boolean | null | undefined>;
};

/** Yakınlık hücresinde gruplanmış harita öğeleri */
export type MarkerGroup = {
  id: string;
  latitude: number;
  longitude: number;
  members: MapMarker[];
  representative: MapMarker;
  count: number;
};

export type MapDetailType = MapLayerId;

export type MapLayerConfig = {
  id: MapLayerId;
  label: string;
  icon: string;
  color: string;
};

export type MapLocationSource =
  | 'business'
  | 'event'
  | 'tourism'
  | 'marketplace'
  | 'vora_needs'
  | 'vora_hizmetler'
  | 'district'
  | 'post_label'
  | 'place'
  | 'gps';

import type { RegionId } from '@/constants/regions';

export type MapLocationSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  latitude: number | null;
  longitude: number | null;
  source: MapLocationSource;
  regionId?: RegionId;
  /** Koordinat yoksa geocode için adres ipucu */
  geocodeHint?: string;
  /** Mapbox Search Box — seçimde koordinat almak için */
  mapboxId?: string;
  sessionToken?: string;
};
