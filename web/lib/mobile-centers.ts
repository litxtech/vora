export type CenterGroup = 'Topluluk' | 'Harita & Konum' | 'Ekonomi & İş' | 'Medya' | 'Sosyal';

export type CenterSpec = {
  slug: string;
  title: string;
  subtitle: string;
  group: CenterGroup;
  accent: string;
  table: string;
  columns: string;
  titleKey: string;
  detailKey?: string;
  status?: { column: string; value: string };
  order?: string;
};

export const MOBILE_CENTERS: CenterSpec[] = [
  { slug: 'sehir', title: 'Şehir', subtitle: 'Liderlik, meclis ve şehir topluluğu', group: 'Topluluk', accent: '#F59E0B', table: 'city_voice_rooms', columns: 'id, title, status, listener_count', titleKey: 'title', detailKey: 'status' },
  { slug: 'etkinlik', title: 'Etkinlik Merkezi', subtitle: 'Konser, festival ve bölgesel etkinlikler', group: 'Topluluk', accent: '#E91E63', table: 'events', columns: 'id, title, description, location_name, starts_at', titleKey: 'title', detailKey: 'location_name', status: { column: 'status', value: 'published' }, order: 'starts_at' },
  { slug: 'kayip', title: 'Kayıp Merkezi', subtitle: 'Kayıp hayvan, insan, eşya ve buluntu', group: 'Topluluk', accent: '#E53935', table: 'lost_items', columns: 'id, title, description, location_name, status', titleKey: 'title', detailKey: 'location_name' },
  { slug: 'yardim', title: 'Yardım & Gönüllülük', subtitle: 'Yardım talepleri ve gönüllü ekipler', group: 'Sosyal', accent: '#EC407A', table: 'help_requests', columns: 'id, title, description, urgency', titleKey: 'title', detailKey: 'urgency' },
  { slug: 'destek', title: 'Canlı Destek', subtitle: 'Destek ekibine yaz', group: 'Topluluk', accent: '#1E88E5', table: 'live_support_tickets', columns: 'id, topic, status, created_at', titleKey: 'topic', detailKey: 'status', order: 'created_at' },
  { slug: 'pazar', title: 'Yerel Pazar', subtitle: 'İkinci el, takas ve al-sat', group: 'Ekonomi & İş', accent: '#FF9800', table: 'marketplace_listings', columns: 'id, title, description, price, currency', titleKey: 'title', detailKey: 'price', status: { column: 'status', value: 'published' } },
  { slug: 'yolculuk', title: 'Paylaşımlı Yolculuk', subtitle: 'Boş koltuk paylaş, yol arkadaşı bul', group: 'Ekonomi & İş', accent: '#2196F3', table: 'ride_trips', columns: 'id, from_city_id, to_city_id, status', titleKey: 'from_city_id', detailKey: 'to_city_id' },
  { slug: 'personel', title: 'Personel Merkezi', subtitle: 'İş ara, ilan ver, başvur', group: 'Ekonomi & İş', accent: '#1E88E5', table: 'job_listings', columns: 'id, title, description, salary_range', titleKey: 'title', detailKey: 'salary_range' },
  { slug: 'otel', title: 'Otel Merkezi', subtitle: 'Konaklama ve öğrenci indirimleri', group: 'Ekonomi & İş', accent: '#00897B', table: 'hotel_listings', columns: 'id, name, description, price_per_night', titleKey: 'name', detailKey: 'price_per_night', status: { column: 'status', value: 'published' } },
  { slug: 'isletme', title: 'İşletme Mağazaları', subtitle: 'Kurumsal vitrin', group: 'Ekonomi & İş', accent: '#7C4DFF', table: 'businesses', columns: 'id, name, description', titleKey: 'name', detailKey: 'description' },
  { slug: 'hizmetler', title: 'Vora Hizmetler', subtitle: 'Usta keşfet, talep oluştur', group: 'Ekonomi & İş', accent: '#0EA5E9', table: 'vora_service_providers', columns: 'id, display_name, profession, city', titleKey: 'display_name', detailKey: 'profession' },
  { slug: 'ihtiyac', title: 'İhtiyaç Ağı', subtitle: 'İhtiyaç paylaş, yardımlaş', group: 'Sosyal', accent: '#7C4DFF', table: 'vora_needs', columns: 'id, title, description, city', titleKey: 'title', detailKey: 'city' },
  { slug: 'date', title: 'Date', subtitle: 'Plan paylaş, birlikte çık', group: 'Sosyal', accent: '#FF6B35', table: 'date_outings', columns: 'id, title, destination, activity', titleKey: 'title', detailKey: 'destination' },
  { slug: 'izdivac', title: 'İzdivaç', subtitle: 'Tanışma ve arkadaşlık', group: 'Sosyal', accent: '#E91E63', table: 'izdivac_profiles', columns: 'id, display_name, city, bio', titleKey: 'display_name', detailKey: 'city' },
];

export const CENTER_GROUPS: CenterGroup[] = ['Topluluk', 'Harita & Konum', 'Ekonomi & İş', 'Medya', 'Sosyal'];

export function centerBySlug(slug: string): CenterSpec | undefined {
  return MOBILE_CENTERS.find((center) => center.slug === slug);
}
