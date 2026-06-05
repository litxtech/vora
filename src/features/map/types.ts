export type MapLayerId =
  | 'incidents'
  | 'posts'
  | 'businesses'
  | 'events'
  | 'lost_found'
  | 'jobs'
  | 'staff'
  | 'job_seekers'
  | 'emergency_pois';

export type MapStyleId = 'standard' | 'dark' | 'light' | 'satellite';

export type ContentFollowType = 'event' | 'incident';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
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
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type MapDetailType = MapLayerId;

export type MapLayerConfig = {
  id: MapLayerId;
  label: string;
  icon: string;
  color: string;
};
