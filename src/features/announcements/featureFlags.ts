import { buildControlSubFeature, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

export const ANNOUNCEMENTS_FEATURE_ID = 'announcements';
const PARENT = 'announcements';
const GROUP = 'tabs' as const;

export const ANNOUNCEMENTS_FEATURE = {
  strip: ANNOUNCEMENTS_FEATURE_ID,
  manageCreate: featureControlId(PARENT, 'manage-create'),
  manageDelete: featureControlId(PARENT, 'manage-delete'),
  manageViewers: featureControlId(PARENT, 'manage-viewers'),
} as const;

export const ANNOUNCEMENTS_SUB_FEATURES: AppFeatureDef[] = [
  {
    id: ANNOUNCEMENTS_FEATURE_ID,
    label: 'Duyuru Panosu',
    group: GROUP,
    parentId: 'feed',
    kind: 'control',
    hint: 'Akış üstündeki yatay duyuru şeridi (video / resim / link)',
    routes: ['/announcements'],
  },
  buildControlSubFeature(PARENT, GROUP, 'manage-create', 'Duyuru oluştur', 'Duyurularım ekranında yeni duyuru'),
  buildControlSubFeature(PARENT, GROUP, 'manage-delete', 'Duyuru sil', 'Duyurularım ekranında silme'),
  buildControlSubFeature(PARENT, GROUP, 'manage-viewers', 'Duyuru izleyicileri', 'Duyuru görüntüleyenler listesi'),
];

export const SUB_FEATURES = ANNOUNCEMENTS_SUB_FEATURES;
