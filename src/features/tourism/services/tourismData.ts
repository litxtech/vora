import { demoArrayFallback } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';
import type { TourismCategory, TourismPlace } from '@/features/tourism/constants';

export async function fetchTourismPlaces(
  regionId: string | null,
  category?: TourismCategory | 'all',
): Promise<TourismPlace[]> {
  if (!regionId) return demoArrayFallback(DEMO_TOURISM);

  let query = supabase
    .from('tourism_places')
    .select('id, category, name, description, address, rating, is_featured')
    .eq('region_id', regionId)
    .order('is_featured', { ascending: false })
    .limit(40);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error || !data?.length) return demoArrayFallback(DEMO_TOURISM);

  return data.map((row) => ({
    id: row.id,
    category: row.category as TourismCategory,
    name: row.name,
    description: row.description,
    address: row.address,
    rating: row.rating != null ? Number(row.rating) : null,
    isFeatured: row.is_featured,
  }));
}

const DEMO_TOURISM: TourismPlace[] = [
  { id: 't1', category: 'waterfall', name: 'Uzungöl', description: 'Doğa harikası göl ve çevresi', address: 'Çaykara, Trabzon', rating: 9.2, isFeatured: true },
  { id: 't2', category: 'waterfall', name: 'Sümela Manastırı', description: 'Tarihi manastır', address: 'Maçka', rating: 9.5, isFeatured: true },
  { id: 't3', category: 'plateau', name: 'Ayder Yaylası', description: 'Rize\'nin ünlü yaylası', address: 'Çamlıhemşin', rating: 8.8, isFeatured: false },
  { id: 't4', category: 'restaurant', name: 'Cevizlik Restoran', description: 'Karadeniz mutfağı', address: 'Ortahisar', rating: 8.5, isFeatured: false },
];
