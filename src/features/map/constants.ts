import type { MapLayerConfig, MapMarker } from '@/features/map/types';

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

export const MAP_LAYERS: MapLayerConfig[] = [
  { id: 'incidents', label: 'Olaylar', icon: 'warning', color: '#EF5350' },
  { id: 'posts', label: 'Haberler', icon: 'newspaper', color: '#1E88E5' },
  { id: 'businesses', label: 'İşletmeler', icon: 'storefront', color: '#43A047' },
  { id: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#9C27B0' },
  { id: 'lost_found', label: 'Kayıp', icon: 'search', color: '#AB47BC' },
];

export const DEFAULT_ENABLED_LAYERS = MAP_LAYERS.map((l) => l.id);

export const LAYER_BY_ID = Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l])) as Record<
  MapLayerConfig['id'],
  MapLayerConfig
>;

/** Veritabanı boşken haritayı canlı göstermek için örnek noktalar */
export const DEMO_MAP_MARKERS: MapMarker[] = [
  {
    id: 'demo-incident-1',
    sourceId: 'demo-incident-1',
    isDemo: true,
    layer: 'incidents',
    title: 'Trafik Yoğunluğu',
    subtitle: 'Ortahisar',
    description: 'Bordo Mavi Bulvarında yoğun trafik bildirildi.',
    latitude: 41.0058,
    longitude: 39.7192,
    meta: { severity: 'medium' },
  },
  {
    id: 'demo-post-1',
    sourceId: 'demo-post-1',
    isDemo: true,
    layer: 'posts',
    title: 'Hamsi Sezonu Başladı',
    subtitle: 'Canlı paylaşım',
    description: 'Karadeniz kıyısında balıkçılar limana dönmeye başladı.',
    latitude: 41.0032,
    longitude: 39.7245,
  },
  {
    id: 'demo-business-1',
    sourceId: 'demo-business-1',
    isDemo: true,
    layer: 'businesses',
    title: 'Karadeniz Kahvesi',
    subtitle: 'Kafe',
    description: 'Yerel kahve ve tatlı — doğrulanmış işletme.',
    latitude: 40.9985,
    longitude: 39.7158,
    meta: { verified: true, sponsored: true },
  },
  {
    id: 'demo-event-1',
    sourceId: 'demo-event-1',
    isDemo: true,
    layer: 'events',
    title: 'Horon Gecesi',
    subtitle: 'Bu akşam 20:00',
    description: 'Geleneksel horon gösterisi ve canlı müzik.',
    latitude: 41.0088,
    longitude: 39.7085,
  },
  {
    id: 'demo-lost-1',
    sourceId: 'demo-lost-1',
    isDemo: true,
    layer: 'lost_found',
    title: 'Kayıp Kedi — Pamuk',
    subtitle: 'Kayıp ilanı',
    description: 'Beyaz tekir, Yeşiltepe mahallesi civarında kayboldu.',
    latitude: 40.9955,
    longitude: 39.731,
  },
  {
    id: 'demo-business-2',
    sourceId: 'demo-business-2',
    isDemo: true,
    layer: 'businesses',
    title: 'Trabzon Balıkçısı',
    subtitle: 'Restoran',
    description: 'Taze Karadeniz balığı ve meze çeşitleri.',
    latitude: 41.012,
    longitude: 39.726,
  },
  {
    id: 'demo-incident-2',
    sourceId: 'demo-incident-2',
    isDemo: true,
    layer: 'incidents',
    title: 'Yağmur Uyarısı',
    subtitle: 'Meteoroloji',
    description: 'Akşam saatlerinde kuvvetli yağış bekleniyor.',
    latitude: 41.018,
    longitude: 39.702,
    meta: { severity: 'high' },
  },
];

export function findDemoMarker(sourceId: string): MapMarker | undefined {
  return DEMO_MAP_MARKERS.find((m) => m.sourceId === sourceId);
}
