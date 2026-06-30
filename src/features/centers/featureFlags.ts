import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'centers-hub';
const GROUP = 'centers' as const;

/** Tüm Merkezler hub ekranı butonları. */
export const CENTERS_HUB_FEATURE = {
  search: featureControlId(PARENT, 'search'),
  support: featureControlId(PARENT, 'support'),
  filterChips: featureControlId(PARENT, 'filter-chips'),
} as const;

export const CENTERS_HUB_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'search', 'Merkez arama', 'Merkezler hub ekranındaki arama çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'support', 'Canlı destek kısayolu', 'Merkezler sekmesindeki destek butonu'),
  buildControlSubFeature(PARENT, GROUP, 'filter-chips', 'Merkez grup filtreleri', 'Ekonomi / sosyal / güvenlik grup filtre çipleri'),
];

export const SUB_FEATURES = CENTERS_HUB_SUB_FEATURES;
