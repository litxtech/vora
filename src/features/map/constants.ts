import type { MapLayerConfig, MapLayerId, MapMarker } from '@/features/map/types';

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
  { id: 'jobs', label: 'İş İlanları', icon: 'briefcase', color: '#F9A825' },
  { id: 'staff', label: 'Personel', icon: 'people', color: '#FF8F00' },
  { id: 'job_seekers', label: 'İş Arayan', icon: 'person-add', color: '#00897B' },
  { id: 'events', label: 'Etkinlikler', icon: 'calendar', color: '#9C27B0' },
  { id: 'lost_found', label: 'Kayıp', icon: 'search', color: '#AB47BC' },
  { id: 'emergency_pois', label: 'Acil Nokta', icon: 'medkit', color: '#C62828' },
];

export const DEFAULT_ENABLED_LAYERS = MAP_LAYERS.map((l) => l.id);

export const LAYER_BY_ID = Object.fromEntries(MAP_LAYERS.map((l) => [l.id, l])) as Record<
  MapLayerId,
  MapLayerConfig
>;

export const POI_CATEGORY_LABELS: Record<string, string> = {
  hospital: 'Hastane',
  pharmacy: 'Eczane',
  police: 'Polis',
  fire: 'İtfaiye',
  veterinary: 'Veteriner',
  afad: 'AFAD',
  other: 'Acil Nokta',
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Tam Zamanlı',
  part_time: 'Yarı Zamanlı',
  seasonal: 'Sezonluk',
  remote: 'Uzaktan',
};

/** Veritabanı boşken haritayı canlı göstermek için örnek noktalar */
export const DEMO_MAP_MARKERS: MapMarker[] = [
  {
    id: 'demo-incident-1',
    sourceId: 'demo-incident-1',
    isDemo: true,
    layer: 'incidents',
    title: 'Trafik Kazası',
    subtitle: 'Ortahisar',
    description: 'Bordo Mavi Bulvarında trafik kazası bildirildi.',
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
    title: 'Valoria Hotel',
    subtitle: 'Otel',
    description: 'Doğrulanmış premium işletme — konaklama ve restoran.',
    latitude: 40.9985,
    longitude: 39.7158,
    meta: { verified: true, sponsored: true },
  },
  {
    id: 'demo-job-1',
    sourceId: 'demo-job-1',
    isDemo: true,
    layer: 'jobs',
    title: 'Resepsiyon Personeli Aranıyor',
    subtitle: 'Valoria Hotel · 35.000 TL',
    description: 'Otel resepsiyonunda deneyimli personel aranıyor. Konaklama sağlanır.',
    latitude: 40.9988,
    longitude: 39.7162,
    meta: { jobType: 'full_time', salaryRange: '35.000 TL', housingProvided: true },
  },
  {
    id: 'demo-staff-1',
    sourceId: 'demo-staff-1',
    isDemo: true,
    layer: 'staff',
    title: 'Sezonluk Aşçı Aranıyor',
    subtitle: '3 pozisyon',
    description: 'Yaz sezonu için deneyimli aşçı ve commis aranıyor.',
    latitude: 41.004,
    longitude: 39.721,
    meta: { positions: 'Aşçı, Commis, Bulaşıkçı' },
  },
  {
    id: 'demo-seeker-1',
    sourceId: 'demo-seeker-1',
    isDemo: true,
    layer: 'job_seekers',
    title: 'Aşçı — 5 yıl deneyim',
    subtitle: 'Trabzon',
    description: 'Sezonluk veya tam zamanlı aşçılık pozisyonu arıyorum.',
    latitude: 41.001,
    longitude: 39.725,
    meta: { experienceYears: 5 },
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
    id: 'demo-poi-1',
    sourceId: 'demo-poi-1',
    isDemo: true,
    layer: 'emergency_pois',
    title: 'Kanuni Hastanesi',
    subtitle: 'Hastane · 7/24',
    description: 'Acil servis ve poliklinik hizmetleri.',
    latitude: 41.0089,
    longitude: 39.7178,
    meta: { category: 'hospital', is24h: true },
  },
  {
    id: 'demo-incident-2',
    sourceId: 'demo-incident-2',
    isDemo: true,
    layer: 'incidents',
    title: 'Elektrik Kesintisi',
    subtitle: 'Ortahisar',
    description: 'Bölgede planlı bakım nedeniyle elektrik kesintisi.',
    latitude: 41.018,
    longitude: 39.702,
    meta: { severity: 'high' },
  },
];

export function findDemoMarker(sourceId: string): MapMarker | undefined {
  return DEMO_MAP_MARKERS.find((m) => m.sourceId === sourceId);
}

export function emptyLayerCounts(): Record<MapLayerId, number> {
  return MAP_LAYERS.reduce(
    (acc, layer) => {
      acc[layer.id] = 0;
      return acc;
    },
    {} as Record<MapLayerId, number>,
  );
}
