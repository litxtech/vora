import {
  buildSectionSubFeature,
  featureSectionId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'settings';
const GROUP = 'programs' as const;

/**
 * Ayarlar ekranındaki menü butonlarının görünürlük kimlikleri.
 * Güvenlik gereği "Hesap Güvenliği", "Hesap Silme" ve "Çıkış Yap"
 * her zaman görünür kalır — buraya eklenmez.
 */
export const SETTINGS_FEATURE = {
  insights: featureSectionId(PARENT, 'insights'),
  identityVerification: featureSectionId(PARENT, 'identity-verification'),
  badgeVisibility: featureSectionId(PARENT, 'badge-visibility'),
  notifications: featureSectionId(PARENT, 'notifications'),
  messaging: featureSectionId(PARENT, 'messaging'),
  screenTime: featureSectionId(PARENT, 'screen-time'),
  securityCenter: featureSectionId(PARENT, 'security-center'),
  supportCenter: featureSectionId(PARENT, 'support-center'),
  platformGuide: featureSectionId(PARENT, 'platform-guide'),
  contribute: featureSectionId(PARENT, 'contribute'),
  inviteCenter: featureSectionId(PARENT, 'invite-center'),
  shareApp: featureSectionId(PARENT, 'share-app'),
} as const;

export const SETTINGS_SUB_FEATURES: AppFeatureDef[] = [
  buildSectionSubFeature(PARENT, GROUP, 'insights', 'İçgörüler & Güven', 'Ayarlardaki içgörü / güven kısayolu'),
  buildSectionSubFeature(PARENT, GROUP, 'identity-verification', 'Kimliğimi Doğrula', 'Kimlik doğrulama menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'badge-visibility', 'Tik Görünürlüğü', 'Rozet / tik görünürlük ayarı'),
  buildSectionSubFeature(PARENT, GROUP, 'notifications', 'Bildirim Ayarları', 'Bildirim ayarları menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'messaging', 'Mesajlaşma Ayarları', 'Mesajlaşma ayarları menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'screen-time', 'Ekran Süresi', 'Ekran süresi menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'security-center', 'Güven Merkezi', 'Gizlilik & güven merkezi satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'support-center', 'Destek Merkezi', 'Yardım & destek merkezi satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'platform-guide', 'Platform Rehberi', 'Platform rehberi menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'contribute', 'Uygulamaya Katkıda Bulun', 'Katkı / bağış menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'invite-center', 'Davet Merkezi', 'Arkadaş davet menü satırı'),
  buildSectionSubFeature(PARENT, GROUP, 'share-app', 'Uygulamayı Paylaş', 'Uygulamayı paylaş menü satırı'),
];

export const SUB_FEATURES = SETTINGS_SUB_FEATURES;
