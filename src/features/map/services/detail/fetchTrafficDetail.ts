import { TRAFFIC_TYPES } from '@/features/traffic/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchTrafficDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('traffic_reports')
    .select('id, report_type, title, description, district, confirm_count, expires_at, region_id, latitude, longitude, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const typeInfo = TRAFFIC_TYPES[data.report_type as keyof typeof TRAFFIC_TYPES];

  return {
    type: 'traffic',
    id: data.id,
    title: data.title,
    subtitle: typeInfo?.label ?? data.report_type,
    description: data.description ?? undefined,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    fields: [
      { label: 'Tür', value: typeInfo?.label ?? data.report_type },
      { label: 'İlçe', value: data.district ?? '—' },
      { label: 'Onay', value: `${data.confirm_count} kişi` },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Bildirim', value: formatDate(data.created_at) ?? '—' },
      { label: 'Geçerlilik', value: formatDate(data.expires_at) ?? '—' },
    ],
  };
}
