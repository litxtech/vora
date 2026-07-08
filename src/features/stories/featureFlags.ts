import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'stories';
const GROUP = 'social' as const;

/** Hikâye halkası, önbellek ve ön yükleme anahtarları. */
export const STORIES_FEATURE = {
  root: PARENT,
  ringBar: featureControlId(PARENT, 'ring-bar'),
  ringBootstrap: featureControlId(PARENT, 'ring-bootstrap'),
  ringBundlePrefetch: featureControlId(PARENT, 'ring-bundle-prefetch'),
} as const;

export const STORIES_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(
    PARENT,
    GROUP,
    'ring-bar',
    'Akış halka şeridi',
    'Akış ekranının üstündeki hikâye halkaları',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'ring-bootstrap',
    'Arka plan önbellek',
    'Oturum açılınca halka verisini diskten yükler ve arka planda günceller',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'ring-bundle-prefetch',
    'Dokununca ön yükleme',
    'Halkaya dokunulunca hikâye içeriğini önceden yükler',
  ),
];

export const SUB_FEATURES = STORIES_SUB_FEATURES;
