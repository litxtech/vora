import {
  buildControlSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { DISCOVERY_TABS } from '@/features/discovery/constants';

const PARENT = 'discover';
const GROUP = 'tabs' as const;

/** Keşfet ekranı başlık ve filtre butonları. */
export const DISCOVERY_FEATURE = {
  userSearch: featureControlId(PARENT, 'user-search'),
  voraAi: featureControlId(PARENT, 'vora-ai'),
  locationFilter: featureControlId(PARENT, 'location-filter'),
  periodFilter: featureControlId(PARENT, 'period-filter'),
  agendaChip: featureControlId(PARENT, 'agenda-chip'),
  communitiesChip: featureControlId(PARENT, 'communities-chip'),
  featuredCarousel: featureControlId(PARENT, 'featured-carousel'),
  headerMap: featureControlId(PARENT, 'header-map'),
  headerIncidents: featureControlId(PARENT, 'header-incidents'),
  tab: (tabId: string) => featureTabId(PARENT, tabId),
} as const;

export const DISCOVERY_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, DISCOVERY_TABS),
  buildControlSubFeature(PARENT, GROUP, 'user-search', 'Kullanıcı arama', 'Keşfet başlığındaki arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'vora-ai', 'Vora AI (keşfet)', 'Keşfet başlığındaki Vora AI kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'location-filter', 'Konum filtresi', 'Keşfet üst şeridindeki konum seçici'),
  buildControlSubFeature(PARENT, GROUP, 'period-filter', 'Zaman filtresi', 'Keşfet üst şeridindeki zaman aralığı seçici'),
  buildControlSubFeature(PARENT, GROUP, 'agenda-chip', 'Gündem kısayolu', 'Keşfet filtre şeridindeki gündem butonu'),
  buildControlSubFeature(PARENT, GROUP, 'communities-chip', 'Topluluk kısayolu', 'Keşfet filtre şeridindeki topluluk butonu'),
  buildControlSubFeature(PARENT, GROUP, 'featured-carousel', 'Öne çıkan profiller', 'Keşfet üstündeki öne çıkan profil şeridi'),
  buildControlSubFeature(PARENT, GROUP, 'header-map', 'Keşfet · Harita', 'Keşfet başlığındaki harita kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'header-incidents', 'Keşfet · Olaylar', 'Keşfet başlığındaki canlı olaylar butonu'),
];

export const SUB_FEATURES = DISCOVERY_SUB_FEATURES;
