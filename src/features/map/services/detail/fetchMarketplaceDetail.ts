import { categoryLabel, formatMarketplacePrice } from '@/features/marketplace/constants';
import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import { formatDate, regionName, type MapDetailRecord } from './shared';

export async function fetchMarketplaceDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await mpSupabase
    .from('marketplace_listings')
    .select(
      `id, title, description, category, listing_type, condition, price, currency,
       district, region_id, cover_url, media_urls, favorite_count, view_count,
       latitude, longitude, created_at, author_id, status`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    id: string;
    title: string;
    description: string;
    category: string;
    listing_type: string;
    condition: string;
    price: number | null;
    currency: string;
    district: string;
    region_id: string;
    cover_url: string | null;
    media_urls: string[];
    favorite_count: number;
    view_count: number;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    author_id: string;
    status: string;
  };

  await mpSupabase.rpc('increment_marketplace_view', { p_listing_id: id });

  return {
    type: 'marketplace',
    id: row.id,
    title: row.title,
    subtitle: categoryLabel(row.category as never),
    description: row.description,
    coverUrl: row.cover_url,
    mediaUrls: row.media_urls ?? [],
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerId: row.author_id,
    fields: [
      { label: 'Fiyat', value: formatMarketplacePrice(row.price, row.listing_type as never, row.currency) },
      { label: 'Kategori', value: categoryLabel(row.category as never) },
      { label: 'Durum', value: row.status === 'active' ? 'Aktif' : row.status },
      { label: 'İlçe', value: row.district },
      { label: 'Bölge', value: regionName(row.region_id) ?? '—' },
      { label: 'Favori', value: String(row.favorite_count ?? 0) },
      { label: 'Görüntülenme', value: String(row.view_count ?? 0) },
      { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
    ],
  };
}
