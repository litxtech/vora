import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'user-sounds';
const GROUP = 'actions' as const;

export const AI_MUSIC_FEATURE = {
  studio: featureControlId(PARENT, 'ai-studio'),
} as const;

export const AI_MUSIC_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(
    PARENT,
    GROUP,
    'ai-studio',
    'AI Müzik',
    'ElevenLabs ile Karadeniz ağırlıklı özgür müzik üretimi',
  ),
];
