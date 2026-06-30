import { buildControlSubFeature, buildSectionSubFeature, buildTabSubFeatures, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { LOST_TABS } from '@/features/lost-found/constants';

const PARENT = 'lost-center';
const GROUP = 'centers' as const;

export const LOST_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  detailMessage: featureControlId(PARENT, 'detail-message'),
  detailCall: featureControlId(PARENT, 'detail-call'),
  detailTip: featureControlId(PARENT, 'detail-tip'),
  detailResolve: featureControlId(PARENT, 'detail-resolve'),
  detailReactivate: featureControlId(PARENT, 'detail-reactivate'),
  detailDelete: featureControlId(PARENT, 'detail-delete'),
  detailShare: featureControlId(PARENT, 'detail-share'),
  section: {
    createLost: `${PARENT}.section.create-lost`,
    createFound: `${PARENT}.section.create-found`,
  },
} as const;

export const LOST_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, LOST_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create-lost', 'Kayıp ilanı ver', 'Kayıp hayvan, eşya veya belge ilanı'),
  buildSectionSubFeature(PARENT, GROUP, 'create-found', 'Buluntu bildir', 'Bulunan eşya veya hayvan bildirimi'),
  buildControlSubFeature(PARENT, GROUP, 'detail-message', 'Detay · Mesaj', 'Kayıp/buluntu detayında mesaj'),
  buildControlSubFeature(PARENT, GROUP, 'detail-call', 'Detay · Ara', 'Kayıp/buluntu detayında telefon'),
  buildControlSubFeature(PARENT, GROUP, 'detail-tip', 'Detay · İpucu ekle', 'Kayıp ilanına ipucu gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-resolve', 'Detay · Bulundu işaretle', 'Sahip · ilanı kapatma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-reactivate', 'Detay · Yeniden yayınla', 'Sahip · gizli ilanı açma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-delete', 'Detay · Sil', 'Sahip · ilanı silme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-share', 'Detay · Paylaş', 'İlan paylaşımı'),
];

export const SUB_FEATURES = LOST_SUB_FEATURES;
