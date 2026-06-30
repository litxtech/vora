import { jobTypeLabel } from '@/features/map/services/mapData';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

type JobDetailRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  job_type: string;
  salary_range: string | null;
  housing_provided: boolean;
  meal_provided: boolean;
  is_urgent: boolean;
  experience_required: string | null;
  location_label: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  created_at: string;
  businesses:
    | { name: string | null; phone: string | null; address: string | null }
    | { name: string | null; phone: string | null; address: string | null }[]
    | null;
};

export async function fetchJobDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('job_listings')
    .select(
      `id, author_id, title, description, job_type, salary_range, housing_provided, meal_provided,
       is_urgent, experience_required, location_label, district,
       latitude, longitude, region_id, created_at,
       businesses (name, phone, address)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (data) {
    await supabase.rpc('increment_job_view_count', { listing_id: id });
  }

  const row = data as JobDetailRow | null;
  if (!row) return null;
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    type: 'jobs',
    id: row.id,
    title: row.title,
    subtitle: business?.name ?? row.location_label ?? 'İş ilanı',
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerId: row.author_id,
    fields: [
      { label: 'Pozisyon', value: row.title },
      { label: 'Maaş', value: row.salary_range ?? 'Görüşülecek' },
      { label: 'Çalışma', value: jobTypeLabel(row.job_type) },
      { label: 'Konaklama', value: row.housing_provided ? 'Var' : 'Yok' },
      { label: 'Yemek', value: row.meal_provided ? 'Var' : 'Yok' },
      { label: 'Deneyim', value: row.experience_required ?? '—' },
      ...(row.is_urgent ? [{ label: 'Öncelik', value: 'Acil' }] : []),
      { label: 'Konum', value: row.location_label ?? row.district ?? regionName(row.region_id) ?? '—' },
      { label: 'İşletme', value: business?.name ?? '—' },
      ...(business?.phone ? [{ label: 'Telefon', value: business.phone }] : []),
      { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
    ],
  };
}
