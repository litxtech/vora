import {
  buildControlSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { SETTINGS_FEATURE } from '@/features/settings/featureFlags';

const PARENT = SETTINGS_FEATURE.insights;
const GROUP = 'programs' as const;

const INSIGHTS_TABS = [
  { id: 'overview', label: 'Özet sekmesi' },
  { id: 'trust', label: 'Güven sekmesi' },
  { id: 'content', label: 'İçerik sekmesi' },
] as const;

/** İçgörüler & Güven ekranı butonları (Ayarlar › İçgörüler altında). */
export const INSIGHTS_FEATURE = {
  tab: {
    overview: featureTabId(PARENT, 'overview'),
    trust: featureTabId(PARENT, 'trust'),
    content: featureTabId(PARENT, 'content'),
  },
  walletHistory: featureControlId(PARENT, 'wallet-history'),
  profileViewers: featureControlId(PARENT, 'profile-viewers'),
  premiumUpsell: featureControlId(PARENT, 'premium-upsell'),
  trustRules: featureControlId(PARENT, 'trust-rules'),
  contentStats: featureControlId(PARENT, 'content-stats'),
  contentDemographics: featureControlId(PARENT, 'content-demographics'),
} as const;

export const INSIGHTS_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, [...INSIGHTS_TABS]),
  buildControlSubFeature(PARENT, GROUP, 'wallet-history', 'Puan geçmişi', 'Güven sekmesindeki cüzdan / puan geçmişi kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'profile-viewers', 'Profil ziyaretçileri', 'İçerik sekmesindeki ziyaretçi listesi'),
  buildControlSubFeature(PARENT, GROUP, 'premium-upsell', "Premium'u keşfet", 'Premium olmayan kullanıcıya gösterilen yükseltme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'trust-rules', 'Puan kuralları', 'Güven sekmesindeki puan kuralları bölümü'),
  buildControlSubFeature(PARENT, GROUP, 'content-stats', 'İçerik performansı', 'Premium içerik istatistikleri kartı'),
  buildControlSubFeature(PARENT, GROUP, 'content-demographics', 'İzleyici demografisi', 'Premium izleyici demografisi kartı'),
];

export const SUB_FEATURES = INSIGHTS_SUB_FEATURES;
