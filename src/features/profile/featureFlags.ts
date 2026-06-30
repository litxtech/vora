import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'profile';
const GROUP = 'tabs' as const;

/** Profil ekranındaki butonların görünürlük kimlikleri. */
export const PROFILE_FEATURE = {
  editProfile: featureControlId(PARENT, 'edit'),
  insights: featureControlId(PARENT, 'insights'),
  closeFriends: featureControlId(PARENT, 'close-friends'),
  follow: featureControlId(PARENT, 'follow'),
  message: featureControlId(PARENT, 'message'),
  settingsGear: featureControlId(PARENT, 'settings-gear'),
  visitorMenu: featureControlId(PARENT, 'visitor-menu'),
} as const;

export const PROFILE_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(
    PARENT,
    GROUP,
    'edit',
    'Profili Düzenle butonu',
    'Profil ekranındaki "Profili Düzenle" butonu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'insights',
    'İstatistik butonu',
    'Profildeki istatistik / içgörü kısayolu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'close-friends',
    'Yakın Arkadaşlar butonu',
    'Profildeki yakın arkadaş listesi kısayolu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'follow',
    'Takip et butonu',
    'Başkasının profilindeki takip / takipten çık butonu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'message',
    'Mesaj gönder butonu',
    'Başkasının profilindeki mesaj butonu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'settings-gear',
    'Ayarlar dişlisi',
    'Kendi profilindeki ayarlar (dişli) butonu',
  ),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'visitor-menu',
    'Profil menüsü',
    'Başkasının profilindeki üç nokta (güvenlik) menüsü',
  ),
];

export const SUB_FEATURES = PROFILE_SUB_FEATURES;
