import {
  buildControlSubFeature,
  buildSectionSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureSectionId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { DATE_CENTER_TABS } from '@/features/date/constants';

const PARENT = 'date-center';
const GROUP = 'centers' as const;

export const DATE_FEATURE = {
  create: featureSectionId(PARENT, 'create'),
  join: featureControlId(PARENT, 'join'),
  tripChat: featureControlId(PARENT, 'trip-chat'),
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
} as const;

export const DATE_SUB_FEATURES: AppFeatureDef[] = [
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Date Oluştur', 'Yeni date planı paylaşma'),
  buildControlSubFeature(PARENT, GROUP, 'join', 'Katılım İsteği', 'Date\'e katılım isteği gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'trip-chat', 'Trip Sohbet', 'Onay sonrası grup sohbeti'),
  ...buildTabSubFeatures(PARENT, GROUP, DATE_CENTER_TABS),
];

export const SUB_FEATURES = DATE_SUB_FEATURES;
