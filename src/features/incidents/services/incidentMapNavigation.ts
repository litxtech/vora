import { INCIDENT_SEVERITY } from '@/features/incidents/constants';
import type { IncidentThread } from '@/features/incidents/types';
import { openMapDirections } from '@/features/map/services/openMapDirections';

export function openIncidentInMap(thread: IncidentThread) {
  if (thread.latitude == null || thread.longitude == null) return;

  const severity = INCIDENT_SEVERITY[thread.severity];

  openMapDirections({
    latitude: thread.latitude,
    longitude: thread.longitude,
    label: thread.title,
    subtitle: severity?.label,
    layer: 'incidents',
    sourceId: thread.id,
  });
}
