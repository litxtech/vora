import { buildControlSubFeature, buildSectionSubFeature, buildTabSubFeatures, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { EVENT_TABS } from '@/features/events/constants';

const PARENT = 'event-center';
const GROUP = 'centers' as const;

export const EVENT_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  featuredCarousel: featureControlId(PARENT, 'featured-carousel'),
  section: {
    create: `${PARENT}.section.create`,
  },
} as const;

export const EVENT_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, EVENT_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Etkinlik oluştur', 'Yeni etkinlik paylaşımı'),
  buildControlSubFeature(PARENT, GROUP, 'featured-carousel', 'Öne çıkan etkinlikler', 'Yaklaşan sekmesindeki öne çıkanlar şeridi'),
];

export const SUB_FEATURES = EVENT_SUB_FEATURES;
