import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

type SeekerRow = {
  id: string;
  user_id: string;
  title: string;
  occupation: string;
  experience_years: number;
  skills: string[];
  description: string | null;
  district: string | null;
  region_id: string;
  latitude: number | null;
  longitude: number | null;
  phone_visible: boolean;
  created_at: string;
};

export async function fetchJobSeekerDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('job_seekers')
    .select(
      'id, title, occupation, experience_years, skills, description, district, region_id, latitude, longitude, phone_visible, created_at, user_id',
    )
    .eq('id', id)
    .maybeSingle();

  const row = data as SeekerRow | null;
  if (!row) return null;
  return {
    type: 'job_seekers',
    id: row.id,
    title: row.title,
    subtitle: row.occupation,
    description: row.description ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerId: row.user_id,
    fields: [
      { label: 'Meslek', value: row.occupation },
      { label: 'Deneyim', value: `${row.experience_years} yıl` },
      { label: 'Beceriler', value: row.skills?.join(', ') || '—' },
      { label: 'Şehir', value: row.district ?? regionName(row.region_id) ?? '—' },
      { label: 'Telefon', value: row.phone_visible ? 'Profilde görünür' : 'Gizli' },
      { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
    ],
  };
}
