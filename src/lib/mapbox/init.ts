import Mapbox from '@rnmapbox/maps';
import { env } from '@/config/env';

let initialized = false;

export function ensureMapboxInitialized(): boolean {
  if (initialized) return true;

  const token = env.mapboxToken;
  if (!token) return false;

  Mapbox.setAccessToken(token);
  initialized = true;
  return true;
}
