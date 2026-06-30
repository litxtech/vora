import {
  buildNestedTabSubFeatures,
  buildSectionSubFeature,
  buildTabSubFeatures,
  buildControlSubFeature,
  featureControlId,
  featureSectionId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import {
  PERSONNEL_APPLICATIONS_VIEWS,
  PERSONNEL_HUBS,
  PERSONNEL_SEEK_FILTERS,
} from '@/features/personnel-center/constants';

const PARENT = 'personnel-center';
const GROUP = 'centers' as const;

const SEEK_HUB = featureTabId(PARENT, 'seek');
const APPLICATIONS_HUB = featureTabId(PARENT, 'applications');

export const PERSONNEL_FEATURE = {
  tab: (tabId: string) => featureTabId(PARENT, tabId),
  seekTab: (tabId: string) => featureTabId(SEEK_HUB, tabId),
  applicationsTab: (tabId: string) => featureTabId(APPLICATIONS_HUB, tabId),
  search: featureControlId(PARENT, 'search'),
  saveSearch: featureControlId(PARENT, 'save-search'),
  savedSearches: featureControlId(PARENT, 'saved-searches'),
  jobSeekerProfile: featureControlId(PARENT, 'job-seeker-profile'),
  cardApply: featureControlId(PARENT, 'card-apply'),
  cardMessage: featureControlId(PARENT, 'card-message'),
  cardCall: featureControlId(PARENT, 'card-call'),
  cardFavorite: featureControlId(PARENT, 'card-favorite'),
  detailApply: featureControlId(PARENT, 'detail-apply'),
  detailMessage: featureControlId(PARENT, 'detail-message'),
  detailCall: featureControlId(PARENT, 'detail-call'),
  detailShare: featureControlId(PARENT, 'detail-share'),
  detailReport: featureControlId(PARENT, 'detail-report'),
  detailEdit: featureControlId(PARENT, 'detail-edit'),
  detailRemove: featureControlId(PARENT, 'detail-remove'),
  detailFill: featureControlId(PARENT, 'detail-fill'),
  applicationChat: featureControlId(PARENT, 'application-chat'),
  applicationCall: featureControlId(PARENT, 'application-call'),
  applicationStatus: featureControlId(PARENT, 'application-status'),
  section: {
    createJob: featureSectionId(PARENT, 'create-job'),
    createStaff: featureSectionId(PARENT, 'create-staff'),
  },
} as const;

export const PERSONNEL_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, PERSONNEL_HUBS),
  ...buildNestedTabSubFeatures(SEEK_HUB, GROUP, PERSONNEL_SEEK_FILTERS),
  ...buildNestedTabSubFeatures(APPLICATIONS_HUB, GROUP, PERSONNEL_APPLICATIONS_VIEWS),
  buildSectionSubFeature(PARENT, GROUP, 'create-job', 'İş ilanı ver', 'Yeni iş ilanı oluşturma'),
  buildSectionSubFeature(PARENT, GROUP, 'create-staff', 'Personel talebi oluştur', 'Personel arama ilanı'),
  buildControlSubFeature(PARENT, GROUP, 'search', 'Personel arama', 'İş ilanı ve aday arama çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'save-search', 'Aramayı kaydet', 'İş arayan sekmesindeki kayıtlı arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'saved-searches', 'Kayıtlı aramalar', 'Kayıtlı arama listesi kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'job-seeker-profile', 'İş arayan profilim', 'İş arayan profil düzenleme kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'card-apply', 'Kart · Başvur', 'İlan kartındaki başvuru butonu'),
  buildControlSubFeature(PARENT, GROUP, 'card-message', 'Kart · Mesaj', 'İlan kartındaki mesaj butonu'),
  buildControlSubFeature(PARENT, GROUP, 'card-call', 'Kart · Ara', 'İlan kartındaki arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'card-favorite', 'Kart · Favori', 'İlan kartındaki favori butonu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-apply', 'Detay · Başvur', 'İlan detayındaki başvuru'),
  buildControlSubFeature(PARENT, GROUP, 'detail-message', 'Detay · Mesaj', 'İlan detayındaki mesaj'),
  buildControlSubFeature(PARENT, GROUP, 'detail-call', 'Detay · Ara', 'İlan detayındaki telefon'),
  buildControlSubFeature(PARENT, GROUP, 'detail-share', 'Detay · Paylaş', 'İlan detayındaki paylaşım'),
  buildControlSubFeature(PARENT, GROUP, 'detail-report', 'Detay · Şikayet', 'İlan detayındaki şikayet'),
  buildControlSubFeature(PARENT, GROUP, 'detail-edit', 'Detay · Düzenle', 'Sahip · ilan düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-remove', 'Detay · Kaldır', 'Sahip · ilanı kaldırma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-fill', 'Detay · Dolduruldu işaretle', 'Sahip · pozisyon dolduruldu'),
  buildControlSubFeature(PARENT, GROUP, 'application-chat', 'Başvuru · Sohbet', 'Başvuru detayındaki mesaj'),
  buildControlSubFeature(PARENT, GROUP, 'application-call', 'Başvuru · Ara', 'Başvuru detayındaki arama'),
  buildControlSubFeature(PARENT, GROUP, 'application-status', 'Başvuru · Onayla/Reddet', 'İşveren başvuru kararı'),
];

export const SUB_FEATURES = PERSONNEL_SUB_FEATURES;
