import { Platform } from 'react-native';
import { spacing } from '@/constants/theme';
import type { RegionId } from '@/constants/regions';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import type { MapLayerConfig, MapLayerId } from '@/features/map/types';
import { TAB_BAR_CONTENT_HEIGHT } from '@/constants/tabBar';

/** Alt tab menü için ayrılan minimum yükseklik (kart gövdesi). */
export const MAP_TAB_BAR_RESERVE = TAB_BAR_CONTENT_HEIGHT;

/** Karadeniz bölgesi — Trabzon merkez */
export const KARADENIZ_MAP_CENTER = {
  latitude: 41.0015,
  longitude: 39.7178,
} as const;

export const KARADENIZ_INITIAL_REGION = {
  ...KARADENIZ_MAP_CENTER,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
} as const;

/** Bölge merkezleri — konum aramasında yakınlık önceliği için */
export const REGION_MAP_CENTER: Record<RegionId, { latitude: number; longitude: number }> = {
  amasya: { latitude: 40.6499, longitude: 35.8353 },
  artvin: { latitude: 41.1828, longitude: 41.8183 },
  bartin: { latitude: 41.6344, longitude: 32.3375 },
  bayburt: { latitude: 40.2552, longitude: 40.2249 },
  bolu: { latitude: 40.7356, longitude: 31.6061 },
  corum: { latitude: 40.5506, longitude: 34.9556 },
  duzce: { latitude: 40.8438, longitude: 31.1565 },
  giresun: { latitude: 40.9128, longitude: 38.3895 },
  gumushane: { latitude: 40.4603, longitude: 39.4814 },
  karabuk: { latitude: 41.2061, longitude: 32.6204 },
  kastamonu: { latitude: 41.3887, longitude: 33.7827 },
  ordu: { latitude: 40.9839, longitude: 37.8764 },
  rize: { latitude: 41.0201, longitude: 40.5234 },
  samsun: { latitude: 41.2867, longitude: 36.33 },
  sinop: { latitude: 42.0267, longitude: 35.1551 },
  tokat: { latitude: 40.3167, longitude: 36.55 },
  trabzon: { latitude: 41.0015, longitude: 39.7178 },
  zonguldak: { latitude: 41.4564, longitude: 31.7987 },
};

export function regionMapCenter(regionId: RegionId): { latitude: number; longitude: number } {
  return REGION_MAP_CENTER[regionId] ?? KARADENIZ_MAP_CENTER;
}

/** Bölge sınır kutusu — Mapbox aramasını yerel sonuçlarla sınırlar [minLng, minLat, maxLng, maxLat] */
export const REGION_MAP_BBOX: Record<RegionId, [number, number, number, number]> = {
  amasya: [35.2, 40.3, 36.5, 41.0],
  artvin: [40.8, 40.8, 42.5, 41.6],
  bartin: [31.8, 41.2, 32.9, 41.9],
  bayburt: [39.8, 39.9, 40.7, 40.6],
  bolu: [30.8, 40.3, 32.4, 41.2],
  corum: [34.2, 40.1, 35.7, 41.0],
  duzce: [30.8, 40.6, 32.2, 41.1],
  giresun: [37.8, 40.5, 39.0, 41.3],
  gumushane: [38.8, 39.9, 40.2, 40.7],
  karabuk: [32.0, 41.0, 33.2, 41.6],
  kastamonu: [32.8, 41.0, 34.5, 41.7],
  ordu: [36.8, 40.5, 38.5, 41.4],
  rize: [40.2, 40.8, 41.2, 41.4],
  samsun: [35.5, 41.0, 37.2, 41.6],
  sinop: [34.5, 41.6, 35.8, 42.3],
  tokat: [35.8, 39.9, 37.3, 40.7],
  trabzon: [39.0, 40.5, 40.3, 41.4],
  zonguldak: [31.2, 41.0, 32.5, 41.8],
};

export function regionMapBbox(regionId: RegionId): string {
  const bbox = REGION_MAP_BBOX[regionId] ?? REGION_MAP_BBOX.trabzon;
  return bbox.join(',');
}

export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
export const MAPBOX_LIGHT_STYLE = 'mapbox://styles/mapbox/light-v11';
export const MAPBOX_STANDARD_STYLE = 'mapbox://styles/mapbox/streets-v12';
export const MAPBOX_SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

export const MAP_STYLE_OPTIONS = [
  { id: 'standard' as const, label: 'Standart', icon: 'map-outline' },
  { id: 'dark' as const, label: 'Koyu', icon: 'moon-outline' },
  { id: 'light' as const, label: 'Açık', icon: 'sunny-outline' },
  { id: 'satellite' as const, label: 'Uydu', icon: 'globe-outline' },
];

export const NEARBY_RADIUS_KM = 15;

/** Alt kartın güvenli alan üstündeki ek yükseklik (px) */
export const MAP_SHEET_EXTRA_BOTTOM = spacing.lg;

/** Konum arama — kaynak başına ve toplam limit */
export const LOCATION_SEARCH_BUSINESS_LIMIT = 14;
export const LOCATION_SEARCH_PER_SOURCE_LIMIT = 8;
export const LOCATION_SEARCH_MAX_RESULTS = 40;
export const LOCATION_SEARCH_MIN_CHARS = 2;

/** Android Mapbox bellek limiti — tablo başına daha az kayıt. */
export const MAP_LAYER_FETCH_LIMIT = Platform.OS === 'android' ? 30 : 80;
export const MAP_SMALL_LAYER_FETCH_LIMIT = Platform.OS === 'android' ? 20 : 60;

/**
 * iOS haritasında (clustering yok) aynı anda render edilecek azami marker sayısı.
 * Görünür bölge dışındaki pin'ler zaten görünmez; viewport culling sonrası bu sınır
 * çok yoğun bölgelerde CPU/GPU ısınmasını engeller. Seçili + canlı pin'ler önceliklidir.
 */
export const MAP_IOS_MAX_VISIBLE_MARKERS = 160;

export const MAP_LAYERS: MapLayerConfig[] = [
  { id: 'incidents', label: 'Olaylar', icon: 'warning', color: '#EF5350' },
  { id: 'posts', label: 'Haberler', icon: 'newspaper', color: '#1E88E5' },
  { id: 'businesses', label: 'İşletmeler', icon: 'storefront', color: '#43A047' },
  { id: 'jobs', label: 'İş İlanları', icon: 'briefcase', color: '#F9A825' },
  { id: 'staff', label: 'Personel', icon: 'people', color: '#FF8F00' },
  { id: 'job_seekers', label: 'İş Arayan', icon: 'person-add', color: '#00897B' },
  { id: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#9C27B0' },
  { id: 'lost_found', label: 'Kayıp', icon: 'search', color: '#AB47BC' },
  { id: 'marketplace', label: 'Pazar', icon: 'storefront', color: '#FF9800' },
  { id: 'vora_needs', label: 'İhtiyaç', icon: 'hand-left', color: '#7C4DFF' },
  { id: 'vora_hizmetler', label: 'Hizmetler', icon: 'construct', color: '#0EA5E9' },
  { id: 'hotels', label: 'Oteller', icon: 'bed', color: HOTEL_ACCENT },
  { id: 'traffic', label: 'Trafik', icon: 'car', color: '#FB8C00' },
  { id: 'tourism', label: 'Turizm', icon: 'compass', color: '#00897B' },
];

export const DEFAULT_ENABLED_LAYERS = MAP_LAYERS.map((l) => l.id);

export const LAYER_BY_ID = Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l])) as Record<
  MapLayerId,
  MapLayerConfig
>;

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Tam Zamanlı',
  part_time: 'Yarı Zamanlı',
  daily: 'Günlük',
  weekly: 'Haftalık',
  seasonal: 'Sezonluk',
  remote: 'Uzaktan',
};

export function emptyLayerCounts(): Record<MapLayerId, number> {
  return MAP_LAYERS.reduce(
    (acc, layer) => {
      acc[layer.id] = 0;
      return acc;
    },
    {} as Record<MapLayerId, number>,
  );
}
