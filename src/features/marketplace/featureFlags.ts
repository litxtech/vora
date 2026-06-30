import {
  buildControlSubFeature,
  buildSectionSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureSectionId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { MARKETPLACE_TABS } from '@/features/marketplace/constants';

const PARENT = 'marketplace';
const GROUP = 'centers' as const;

const CREATE_SECTION = featureSectionId(PARENT, 'create');

export const MARKETPLACE_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  listingPhotos: featureControlId(CREATE_SECTION, 'photos'),
  search: featureControlId(PARENT, 'search'),
  filter: featureControlId(PARENT, 'filter'),
  categoryPicker: featureControlId(PARENT, 'category-picker'),
  accountShortcut: featureControlId(PARENT, 'account-shortcut'),
  detailFavorite: featureControlId(PARENT, 'detail-favorite'),
  detailShare: featureControlId(PARENT, 'detail-share'),
  detailReport: featureControlId(PARENT, 'detail-report'),
  detailMessage: featureControlId(PARENT, 'detail-message'),
  detailBuy: featureControlId(PARENT, 'detail-buy'),
  detailOffer: featureControlId(PARENT, 'detail-offer'),
  detailEdit: featureControlId(PARENT, 'detail-edit'),
  detailOwnerMenu: featureControlId(PARENT, 'detail-owner-menu'),
  section: {
    create: CREATE_SECTION,
  },
} as const;

export const MARKETPLACE_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, MARKETPLACE_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'İlan oluştur', 'Yeni pazar ilanı verme'),
  buildControlSubFeature(
    CREATE_SECTION,
    GROUP,
    'photos',
    'İlan fotoğrafı yükleme',
    'İlan oluştururken galeriden fotoğraf seçme',
  ),
  buildControlSubFeature(PARENT, GROUP, 'search', 'Pazar arama', 'Yerel Pazar ekranındaki arama çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'filter', 'Pazar filtreleri', 'Sıralama ve filtre butonları'),
  buildControlSubFeature(PARENT, GROUP, 'category-picker', 'Pazar kategorileri', 'Kategori seçici sekmesi'),
  buildControlSubFeature(PARENT, GROUP, 'account-shortcut', 'Pazar hesabım', 'Başlıktaki hesap / panel kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-favorite', 'Detay · Favori', 'İlan detayındaki favori'),
  buildControlSubFeature(PARENT, GROUP, 'detail-share', 'Detay · Paylaş', 'İlan detayındaki paylaşım'),
  buildControlSubFeature(PARENT, GROUP, 'detail-report', 'Detay · Şikayet', 'İlan detayındaki şikayet'),
  buildControlSubFeature(PARENT, GROUP, 'detail-message', 'Detay · Mesaj', 'Satıcıya mesaj'),
  buildControlSubFeature(PARENT, GROUP, 'detail-buy', 'Detay · Satın al', 'Güvenli satın alma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-offer', 'Detay · Teklif ver', 'Fiyat teklifi gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-edit', 'Detay · Düzenle', 'Sahip · ilan düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-owner-menu', 'Detay · İlan yönetimi', 'Sahip · durum ve menü aksiyonları'),
];

export const SUB_FEATURES = MARKETPLACE_SUB_FEATURES;
