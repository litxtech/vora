import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'reels';
const GROUP = 'tabs' as const;

/** Reels oynatıcı üzerindeki etkileşim butonları. */
export const REELS_FEATURE = {
  like: featureControlId(PARENT, 'like'),
  comment: featureControlId(PARENT, 'comment'),
  share: featureControlId(PARENT, 'share'),
  shareChat: featureControlId(PARENT, 'share-chat'),
  save: featureControlId(PARENT, 'save'),
  more: featureControlId(PARENT, 'more'),
  follow: featureControlId(PARENT, 'follow'),
} as const;

export const REELS_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'like', 'Beğeni butonu', 'Reels oynatıcıdaki kalp / beğeni butonu'),
  buildControlSubFeature(PARENT, GROUP, 'comment', 'Yorum butonu', 'Reels oynatıcıdaki yorum butonu'),
  buildControlSubFeature(PARENT, GROUP, 'share', 'Paylaş butonu', 'Reeli dışarı paylaşma butonu'),
  buildControlSubFeature(PARENT, GROUP, 'share-chat', 'Mesaja gönder butonu', 'Reeli sohbete iletme (uçak) butonu'),
  buildControlSubFeature(PARENT, GROUP, 'save', 'Kaydet butonu', 'Reeli kaydetme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'more', 'Daha fazla menüsü', 'Reels üç nokta (şikayet/güvenlik) menüsü'),
  buildControlSubFeature(PARENT, GROUP, 'follow', 'Takip et butonu', 'Reels oynatıcıdaki takip et butonu'),
];

export const SUB_FEATURES = REELS_SUB_FEATURES;
