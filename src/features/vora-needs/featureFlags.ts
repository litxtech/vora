import {
  buildControlSubFeature,
  buildSectionSubFeature,
  buildTabSubFeatures,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { VORA_NEED_FEED_TABS } from '@/features/vora-needs/constants';

const PARENT = 'vora-needs';
const GROUP = 'centers' as const;

export const VORA_NEEDS_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  search: featureControlId(PARENT, 'search'),
  filter: featureControlId(PARENT, 'filter'),
  cardFavorite: featureControlId(PARENT, 'card-favorite'),
  detailMessage: featureControlId(PARENT, 'detail-message'),
  detailFavorite: featureControlId(PARENT, 'detail-favorite'),
  detailReport: featureControlId(PARENT, 'detail-report'),
  detailReactivate: featureControlId(PARENT, 'detail-reactivate'),
  detailHide: featureControlId(PARENT, 'detail-hide'),
  detailDelete: featureControlId(PARENT, 'detail-delete'),
  section: {
    create: `${PARENT}.section.create`,
  },
} as const;

export const VORA_NEEDS_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, VORA_NEED_FEED_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'İhtiyaç ilanı oluştur', 'Yeni ihtiyaç paylaşımı'),
  buildControlSubFeature(PARENT, GROUP, 'search', 'İhtiyaç arama', 'İhtiyaç merkezi arama çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'filter', 'İhtiyaç filtreleri', 'Kategori ve aciliyet filtre butonu'),
  buildControlSubFeature(PARENT, GROUP, 'card-favorite', 'Liste · Favori', 'İlan kartındaki favori butonu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-message', 'Detay · Mesaj gönder', 'İlan detayındaki mesaj gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-favorite', 'Detay · Favori', 'İlan detayındaki favori butonu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-report', 'Detay · Şikayet', 'İlan detayındaki şikayet butonu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-reactivate', 'Detay · Yeniden yayınla', 'Sahip · gizli ilanı tekrar yayınlama'),
  buildControlSubFeature(PARENT, GROUP, 'detail-hide', 'Detay · Yayından kaldır', 'Sahip · ilanı gizleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-delete', 'Detay · İlanı sil', 'Sahip · ilanı kalıcı silme'),
];

export const SUB_FEATURES = VORA_NEEDS_SUB_FEATURES;
