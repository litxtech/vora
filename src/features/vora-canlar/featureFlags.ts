import {
  buildControlSubFeature,
  buildSectionSubFeature,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'vora-canlar';
const GROUP = 'centers' as const;

export const VORA_CANLAR_FEATURE = {
  search: `${PARENT}.control.search`,
  createCase: `${PARENT}.section.create-case`,
  createPost: `${PARENT}.section.create-post`,
  donate: `${PARENT}.section.donate`,
} as const;

export const VORA_CANLAR_SUB_FEATURES: AppFeatureDef[] = [
  buildSectionSubFeature(PARENT, GROUP, 'create-case', 'İhbar oluştur', 'Yeni hayvan ihbarı'),
  buildSectionSubFeature(PARENT, GROUP, 'create-post', 'Hayvan gönderisi', 'Vora Canlar gönderisi'),
  buildSectionSubFeature(PARENT, GROUP, 'donate', 'Bağış', 'Kampanyaya bağış'),
  buildControlSubFeature(PARENT, GROUP, 'search', 'Arama ve filtre', 'Hayvan arama'),
];

export const SUB_FEATURES = VORA_CANLAR_SUB_FEATURES;
