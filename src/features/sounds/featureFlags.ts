import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'user-sounds';
const GROUP = 'actions' as const;

export const SOUNDS_FEATURE = {
  create: featureControlId(PARENT, 'create'),
  picker: featureControlId(PARENT, 'picker'),
  detail: featureControlId(PARENT, 'detail'),
} as const;

export const SOUNDS_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'create', 'Ses Oluştur', 'Profil ve içerik oluşturma ekranından ses kaydı'),
  buildControlSubFeature(PARENT, GROUP, 'picker', 'Ses Seçici', 'Hikaye, gönderi ve videoda ses seçimi'),
  buildControlSubFeature(PARENT, GROUP, 'detail', 'Ses Sayfası', 'Ses detay ve istatistik ekranı'),
];

export const SUB_FEATURES = SOUNDS_SUB_FEATURES;
