import { formatDate, regionName, type MapDetailRecord } from './shared';
import {
  amenityLabel,
  discountedPrice,
  formatHotelPrice,
  hotelListPriceDisplay,
} from '@/features/hotel-center/constants';
import { incrementHotelView } from '@/features/hotel-center/services/hotelData';
import { supabase } from '@/lib/supabase/client';

type HotelMapRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  price_per_night: number;
  list_price_per_night: number | null;
  student_discount_pct: number;
  student_discount_note: string | null;
  cover_url: string | null;
  media_urls: string[];
  amenities: string[];
  phone: string | null;
  whatsapp: string | null;
  district: string | null;
  region_id: string;
  latitude: number | null;
  longitude: number | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
};

export async function fetchHotelMapDetail(id: string): Promise<MapDetailRecord | null> {
  const { data } = await supabase
    .from('hotel_listings')
    .select(
      `id, owner_id, name, description, price_per_night, list_price_per_night, student_discount_pct, student_discount_note,
       cover_url, media_urls, amenities, phone, whatsapp, district, region_id,
       latitude, longitude, avg_rating, review_count, created_at`,
    )
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!data) return null;

  void incrementHotelView(id);

  const row = data as unknown as HotelMapRow;
  const finalPrice = discountedPrice(row.price_per_night, row.student_discount_pct);
  const listPrice = hotelListPriceDisplay(row.list_price_per_night, row.price_per_night);
  const priceLabel = listPrice != null
    ? `Vora özel ${formatHotelPrice(finalPrice)}/gece (liste ${formatHotelPrice(listPrice)})`
    : row.student_discount_pct > 0
      ? `Vora özel ${formatHotelPrice(finalPrice)}/gece (öğrenci -%${row.student_discount_pct})`
      : `Vora özel ${formatHotelPrice(row.price_per_night)}/gece`;

  return {
    type: 'hotels',
    id: row.id,
    title: row.name,
    subtitle:
      row.review_count > 0
        ? `⭐ ${Number(row.avg_rating).toFixed(1)} · ${row.review_count} değerlendirme`
        : 'Yeni otel',
    description: row.description,
    coverUrl: row.cover_url,
    mediaUrls: row.media_urls?.length ? row.media_urls : row.cover_url ? [row.cover_url] : [],
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    fields: [
      {
        label: 'Fiyat',
        value: priceLabel,
      },
      { label: 'Puan', value: row.review_count > 0 ? `${Number(row.avg_rating).toFixed(1)} / 5` : '—' },
      { label: 'Değerlendirme', value: String(row.review_count) },
      ...(row.student_discount_note ? [{ label: 'İndirim', value: row.student_discount_note }] : []),
      ...(row.amenities.length
        ? [{ label: 'Olanaklar', value: row.amenities.map(amenityLabel).join(', ') }]
        : []),
      { label: 'İlçe', value: row.district ?? '—' },
      { label: 'Bölge', value: regionName(row.region_id) ?? '—' },
      ...(row.phone ? [{ label: 'Telefon', value: row.phone }] : []),
      ...(row.whatsapp ? [{ label: 'WhatsApp', value: row.whatsapp }] : []),
      { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
    ],
  };
}
