import {
  buildControlSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'wallet';
const GROUP = 'programs' as const;

const WALLET_TABS = [
  { id: 'points', label: 'Puan sekmesi' },
  { id: 'earnings', label: 'Kazançlar sekmesi' },
] as const;

/** Cüzdan ekranı butonları ve sekmeleri. */
export const WALLET_FEATURE = {
  tab: {
    points: featureTabId(PARENT, 'points'),
    earnings: featureTabId(PARENT, 'earnings'),
  },
  quickReferral: featureControlId(PARENT, 'quick-referral'),
  quickInsights: featureControlId(PARENT, 'quick-insights'),
  activityFilters: featureControlId(PARENT, 'activity-filters'),
  referralPanel: featureControlId(PARENT, 'referral-panel'),
  referralDetail: featureControlId(PARENT, 'referral-detail'),
  referralWithdraw: featureControlId(PARENT, 'referral-withdraw'),
} as const;

export const WALLET_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, [...WALLET_TABS]),
  buildControlSubFeature(PARENT, GROUP, 'quick-referral', 'Hakediş kısayolu', 'Cüzdan hızlı işlemler · davet kazançları'),
  buildControlSubFeature(PARENT, GROUP, 'quick-insights', 'İstatistik kısayolu', 'Cüzdan hızlı işlemler · puan kuralları / içgörüler'),
  buildControlSubFeature(PARENT, GROUP, 'activity-filters', 'Hareket filtreleri', 'Cüzdan puan sekmesindeki Tümü / Puan / TRY filtre çipleri'),
  buildControlSubFeature(PARENT, GROUP, 'referral-panel', 'Hakediş paneli', 'Kazançlar sekmesindeki hakediş özeti kartı'),
  buildControlSubFeature(PARENT, GROUP, 'referral-detail', 'Hakediş detay butonu', 'Hakediş kartındaki detay sayfası kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'referral-withdraw', 'Çekim talep et', 'Hakediş kartındaki çekim talebi butonu'),
];

export const SUB_FEATURES = WALLET_SUB_FEATURES;
