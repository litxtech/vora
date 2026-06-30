import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

type StaffDetailRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  positions: string[];
  positions_count: number | null;
  salary_range: string | null;
  is_urgent: boolean;
  housing_provided: boolean;
  meal_provided: boolean;
  location_label: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  created_at: string;
  businesses:
    | { name: string | null; phone: string | null }
    | { name: string | null; phone: string | null }[]
    | null;
};

export async function fetchStaffDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('staff_requests')
    .select(
      `id, author_id, title, description, positions, positions_count, salary_range,
       is_urgent, housing_provided, meal_provided, location_label, district,
       latitude, longitude, region_id, created_at,
       businesses (name, phone)`,
    )
    .eq('id', id)
    .maybeSingle();

  const row = data as StaffDetailRow | null;
  if (!row) return null;
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  return {
    type: 'staff',
    id: row.id,
    title: row.title,
    subtitle: business?.name ?? 'Personel arayan',
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerId: row.author_id,
    fields: [
      { label: 'Pozisyonlar', value: row.positions?.join(', ') || '—' },
      { label: 'Kişi sayısı', value: row.positions_count ? String(row.positions_count) : '—' },
      { label: 'Maaş', value: row.salary_range ?? 'Görüşülecek' },
      { label: 'Konaklama', value: row.housing_provided ? 'Var' : 'Yok' },
      { label: 'Yemek', value: row.meal_provided ? 'Var' : 'Yok' },
      ...(row.is_urgent ? [{ label: 'Öncelik', value: 'Acil' }] : []),
      { label: 'Konum', value: row.location_label ?? row.district ?? regionName(row.region_id) ?? '—' },
      { label: 'İşletme', value: business?.name ?? '—' },
      ...(business?.phone ? [{ label: 'Telefon', value: business.phone }] : []),
      { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
    ],
  };
}
