import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  buildMapMarkerId,
  TABLE_LAYER_MAP,
  type MapRealtimeTable,
} from '@/features/map/services/mapMarkerIds';

function isMapRealtimeTable(table: string): table is MapRealtimeTable {
  return table in TABLE_LAYER_MAP;
}

export function shouldRemoveMarkerFromMap(
  table: MapRealtimeTable,
  row: Record<string, unknown>,
): boolean {
  switch (table) {
    case 'events':
      return row.status !== 'published';
    case 'lost_items':
      return row.status !== 'open';
    case 'posts':
      return row.status !== 'published';
    case 'incident_reports':
      return row.status === 'dismissed' || row.status === 'resolved';
    case 'traffic_reports':
      return row.is_active === false;
    case 'marketplace_listings':
      return row.status !== 'active' || row.content_status !== 'published';
    case 'vora_needs':
      return row.status !== 'active' || row.content_status !== 'published';
    case 'vora_service_requests':
      return row.status !== 'pending_offers';
    case 'vora_service_providers':
      return row.is_active === false;
    case 'job_listings':
    case 'staff_requests':
    case 'job_seekers':
      return row.status !== 'published';
    case 'tourism_places':
      return false;
    case 'hotel_listings':
      return row.status !== 'published';
    default:
      return false;
  }
}

export function resolveMarkerIdFromRealtimePayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): string | null {
  const table = payload.table;
  if (!isMapRealtimeTable(table)) return null;

  const layer = TABLE_LAYER_MAP[table];

  if (payload.eventType === 'DELETE') {
    const sourceId = payload.old?.id;
    return typeof sourceId === 'string' ? buildMapMarkerId(layer, sourceId) : null;
  }

  if (payload.eventType === 'UPDATE') {
    const newRow = payload.new ?? {};
    if (!shouldRemoveMarkerFromMap(table, newRow)) return null;
    const sourceId = newRow.id;
    return typeof sourceId === 'string' ? buildMapMarkerId(layer, sourceId) : null;
  }

  return null;
}
