import {
  buildControlSubFeature,
  buildSectionSubFeature,
  featureControlId,
  featureSectionId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'business-center';
const GROUP = 'centers' as const;

/** İşletme paneli kısayol ve hub butonları. */
export const BUSINESS_FEATURE = {
  quick: {
    shopView: featureControlId(PARENT, 'quick-shop-view'),
    curate: featureControlId(PARENT, 'quick-curate'),
    edit: featureControlId(PARENT, 'quick-edit'),
    payout: featureControlId(PARENT, 'quick-payout'),
  },
  section: {
    createProduct: featureSectionId(PARENT, 'create-product'),
    myProducts: featureSectionId(PARENT, 'my-products'),
    sales: featureSectionId(PARENT, 'sales'),
    hotelManage: featureSectionId(PARENT, 'hotel-manage'),
    hotelReservations: featureSectionId(PARENT, 'hotel-reservations'),
    hotelEarnings: featureSectionId(PARENT, 'hotel-earnings'),
    showcaseShop: featureSectionId(PARENT, 'showcase-shop'),
    showcaseCurate: featureSectionId(PARENT, 'showcase-curate'),
    shopSetup: featureSectionId(PARENT, 'shop-setup'),
    ads: featureSectionId(PARENT, 'ads'),
    shopBoost: featureSectionId(PARENT, 'shop-boost'),
    campaigns: featureSectionId(PARENT, 'campaigns'),
    announcements: featureSectionId(PARENT, 'announcements'),
    personnel: featureSectionId(PARENT, 'personnel'),
    shopSettings: featureSectionId(PARENT, 'shop-settings'),
    payoutProfile: featureSectionId(PARENT, 'payout-profile'),
    editBusiness: featureSectionId(PARENT, 'edit-business'),
    setupBanner: featureSectionId(PARENT, 'setup-banner'),
    application: featureSectionId(PARENT, 'application'),
    accountHub: featureSectionId(PARENT, 'account-hub'),
  },
} as const;

const QUICK_CONTROLS: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'quick-shop-view', 'Mağazayı gör', 'Hızlı şerit · canlı vitrin önizlemesi'),
  buildControlSubFeature(PARENT, GROUP, 'quick-curate', 'Vitrin düzenle (hızlı)', 'Hızlı şerit · vitrin düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'quick-edit', 'Profil & logo (hızlı)', 'Hızlı şerit · işletme profili düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'quick-payout', 'Ödeme profili (hızlı)', 'Hızlı şerit · IBAN / Stripe profili'),
];

const HUB_SECTIONS: AppFeatureDef[] = [
  buildSectionSubFeature(PARENT, GROUP, 'setup-banner', 'Mağaza kurulum bannerı', 'Yayına alma teşvik bannerı'),
  buildSectionSubFeature(PARENT, GROUP, 'create-product', 'Ürün ekle', 'İşletme paneli · yeni ürün ekleme'),
  buildSectionSubFeature(PARENT, GROUP, 'my-products', 'Ürünlerim', 'İşletme paneli · ürün listesi'),
  buildSectionSubFeature(PARENT, GROUP, 'sales', 'Satışlar', 'İşletme paneli · satış özeti'),
  buildSectionSubFeature(PARENT, GROUP, 'hotel-manage', 'Otel yönetimi', 'İşletme paneli · otel kayıtları'),
  buildSectionSubFeature(PARENT, GROUP, 'hotel-reservations', 'Rezervasyonlar', 'İşletme paneli · otel rezervasyonları'),
  buildSectionSubFeature(PARENT, GROUP, 'hotel-earnings', 'Otel kazançları', 'İşletme paneli · otel gelir takibi'),
  buildSectionSubFeature(PARENT, GROUP, 'showcase-shop', 'Kurumsal vitrin', 'İşletme paneli · vitrin görünümü'),
  buildSectionSubFeature(PARENT, GROUP, 'showcase-curate', 'Vitrin düzenle', 'İşletme paneli · vitrin yönetimi'),
  buildSectionSubFeature(PARENT, GROUP, 'shop-setup', 'Mağaza kurulumu', 'İşletme paneli · sektör ve mod seçimi'),
  buildSectionSubFeature(PARENT, GROUP, 'ads', 'Reklam stüdyosu', 'İşletme paneli · reklam oluşturma'),
  buildSectionSubFeature(PARENT, GROUP, 'shop-boost', 'Mağazayı öne çıkar', 'İşletme paneli · vitrin boost'),
  buildSectionSubFeature(PARENT, GROUP, 'campaigns', 'Kampanya', 'İşletme paneli · profil kampanyası'),
  buildSectionSubFeature(PARENT, GROUP, 'announcements', 'Duyuru paylaş', 'İşletme paneli · akış duyurusu'),
  buildSectionSubFeature(PARENT, GROUP, 'personnel', 'Personel & ilan', 'İşletme paneli · personel merkezi'),
  buildSectionSubFeature(PARENT, GROUP, 'shop-settings', 'Mağaza ayarları', 'İşletme paneli · mod ve yayın ayarları'),
  buildSectionSubFeature(PARENT, GROUP, 'payout-profile', 'IBAN & ödeme profili', 'İşletme paneli · ödeme hesabı kartı'),
  buildSectionSubFeature(PARENT, GROUP, 'edit-business', 'İşletme bilgilerini düzenle', 'İşletme paneli · bilgi düzenleme butonu'),
  buildSectionSubFeature(PARENT, GROUP, 'application', 'İşletme başvurusu', 'Profil ve ayarlardaki işletme başvurusu kısayolu'),
  buildSectionSubFeature(PARENT, GROUP, 'account-hub', 'İşletme paneli kısayolu', 'Profil ve ayarlardaki işletme paneli girişi'),
];

export const BUSINESS_SUB_FEATURES: AppFeatureDef[] = [...QUICK_CONTROLS, ...HUB_SECTIONS];

export const SUB_FEATURES = BUSINESS_SUB_FEATURES;
