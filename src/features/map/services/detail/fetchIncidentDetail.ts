import { supabase } from '@/lib/supabase/client';
import {
  formatDate,
  regionName,
  severityLabel,
  statusLabelIncident,
  type MapDetailRecord,
} from './shared';

export async function fetchIncidentDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('incident_reports')
    .select('id, title, description, severity, status, region_id, latitude, longitude, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    type: 'incidents',
    id: data.id,
    title: data.title,
    subtitle: severityLabel(data.severity),
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    fields: [
      { label: 'Önem', value: severityLabel(data.severity) },
      { label: 'Durum', value: statusLabelIncident(data.status) },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Bildirim', value: formatDate(data.created_at) ?? '—' },
    ],
  };
}
