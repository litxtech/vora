import type { AppStoreLinksConfig } from '@/features/app-share/types';
import { IOS_APP_STORE_URL } from '@/lib/sharing/constants';

export const APP_STORE_LINKS_CONFIG_KEY = 'app_store_links';

/** Dış paylaşım kartı genişliği (galeri / sosyal medya) */
export const APP_SHARE_CARD_WIDTH = 360;

export const DEFAULT_APP_STORE_LINKS: AppStoreLinksConfig = {
  ios_url: IOS_APP_STORE_URL,
  android_url: '',
  title: "Vora X'i Keşfet",
  subtitle: "Karadeniz'in canlı dijital ağı",
  share_message:
    "Karadeniz'in dijital topluluğu Vora'ya katıl! Yerel haber, etkinlik ve topluluk tek uygulamada.",
  utm_source: 'vora',
  utm_medium: 'app_share',
  utm_campaign: 'user_referral',
  admin_note: '',
};
