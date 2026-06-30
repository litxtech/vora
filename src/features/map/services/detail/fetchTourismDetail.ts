import { TOURISM_CATEGORIES } from '@/features/tourism/constants';
import { supabase } from '@/lib/supabase/client';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchTourismDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('tourism_places')
    .select('id, category, name, description, address, rating, is_featured, image_url, region_id, latitude, longitude, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const categoryInfo = TOURISM_CATEGORIES[data.category as keyof typeof TOURISM_CATEGORIES];

  return {
    type: 'tourism',
    id: data.id,
    title: data.name,
    subtitle: categoryInfo?.label ?? data.category,
    description: data.description ?? undefined,
    coverUrl: data.image_url,
    latitude: data.latitude,
    longitude: data.longitude,
    createdAt: data.created_at,
    fields: [
      { label: 'Kategori', value: categoryInfo?.label ?? data.category },
      { label: 'Adres', value: data.address ?? '—' },
      { label: 'Puan', value: data.rating != null ? String(data.rating) : '—' },
      { label: 'Öne Çıkan', value: data.is_featured ? 'Evet' : 'Hayır' },
      { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
      { label: 'Kayıt', value: formatDate(data.created_at) ?? '—' },
    ],
  };
}
