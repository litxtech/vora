export type AppStoreLinksConfig = {
  ios_url: string;
  android_url: string;
  title: string;
  subtitle: string;
  share_message: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  admin_note?: string;
};

export type AppSharePlatform = 'ios' | 'android';

export type AppShareChannel = 'copy' | 'share' | 'whatsapp';
