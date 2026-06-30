import type { ProfileLinkKind, ProfileSocialPlatform } from '@/features/profile/types';

export const MAX_PROFILE_SOCIAL_LINKS = 12;
export const MAX_PROFILE_WEBSITE_LINKS = 5;

export type SocialPlatformDef = {
  id: ProfileSocialPlatform;
  label: string;
  icon: string;
  iconSet: 'fontawesome5' | 'ionicons';
  usernamePlaceholder: string;
  usernameHint?: string;
  color: string;
};

export const SOCIAL_PLATFORM_DEFS: SocialPlatformDef[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: 'instagram',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici_adi',
    color: '#E4405F',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    icon: 'twitter',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici_adi',
    color: '#000000',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: 'facebook',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici.adi',
    color: '#1877F2',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: 'youtube',
    iconSet: 'fontawesome5',
    usernamePlaceholder: '@kanal',
    usernameHint: 'Kanal adı veya @kullanici',
    color: '#FF0000',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: 'tiktok',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici_adi',
    color: '#000000',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'linkedin',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici-adi',
    color: '#0A66C2',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: 'github',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici',
    color: '#181717',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'whatsapp',
    iconSet: 'fontawesome5',
    usernamePlaceholder: '905xxxxxxxxx',
    usernameHint: 'Ülke kodu ile telefon numarası',
    color: '#25D366',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'telegram',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici',
    color: '#26A5E4',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    icon: 'snapchat',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici',
    color: '#FFFC00',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: 'pinterest',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici',
    color: '#BD081C',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    icon: 'spotify',
    iconSet: 'fontawesome5',
    usernamePlaceholder: 'kullanici',
    usernameHint: 'Karmaşık profiller için özel URL kullanın',
    color: '#1DB954',
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: 'at',
    iconSet: 'ionicons',
    usernamePlaceholder: 'kullanici_adi',
    color: '#000000',
  },
];

export const SOCIAL_PLATFORM_MAP = Object.fromEntries(
  SOCIAL_PLATFORM_DEFS.map((def) => [def.id, def]),
) as Record<ProfileSocialPlatform, SocialPlatformDef>;

export type ProfileLinkDraft = {
  kind: ProfileLinkKind;
  platform: ProfileSocialPlatform | null;
  username: string;
  useCustomUrl: boolean;
  url: string;
  title: string;
};
