import { supabase } from '@/lib/supabase/client';
import { regionName, type MapDetailRecord } from './shared';

export async function fetchBusinessDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, category, description, phone, address, is_verified, region_id, latitude, longitude, created_at, owner_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    type: 'businesses',
    id: data.id,
    title: data.name,
    subtitle: data.category,
    description: data.description ?? undefined,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    ownerId: data.owner_id,
    fields: [
      { label: 'Kategori', value: data.category },
      { label: 'Telefon', value: data.phone ?? '—' },
      { label: 'Adres', value: data.address ?? '—' },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Doğrulama', value: data.is_verified ? 'Doğrulanmış' : 'Doğrulanmamış' },
    ],
  };
}
