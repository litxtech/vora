import { buildControlSubFeature, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'auth-login';
const GROUP = 'auth' as const;

/** Lobi ekranı butonları (Giriş Yap özelliği altında). */
export const AUTH_FEATURE = {
  lobbyFeedback: featureControlId(PARENT, 'lobby-feedback'),
} as const;

export const AUTH_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(
    PARENT,
    GROUP,
    'lobby-feedback',
    'Geliştiriciye öneri / destek',
    'Lobi ekranındaki geri bildirim ve destek linki',
  ),
];

export const SUB_FEATURES = AUTH_SUB_FEATURES;
