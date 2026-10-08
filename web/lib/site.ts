export const SITE_NAME = 'Vora';
export const SUPPORT_EMAIL = 'support@litxtech.com';
export const ORGANIZATION_NAME = 'LitxTech';

export const IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ||
  process.env.EXPO_PUBLIC_IOS_APP_STORE_URL ||
  'https://apps.apple.com/tr/app/vora-x/id6777120091?l=tr';

export const ANDROID_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL ||
  process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.litxtech.vora';

/** Türkçe kök URL'dedir. Diğer diller yalnızca gerçek çeviri kaydı varsa /en /de /es altında açılır. */
export const LOCALES = ['tr', 'en', 'de', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';
export const TRANSLATED_LOCALES = ['en', 'de', 'es'] as const;

export function siteUrl(): string {
  const raw =
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.EXPO_PUBLIC_SHARE_BASE_URL ||
    'https://vora.app';
  return raw.replace(/\/$/, '');
}

export function isIndexableDeployment(): boolean {
  return process.env.PUBLIC_SITE_INDEXABLE === 'true';
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export function canonicalPath(path: string): string {
  const [withoutQuery] = path.split('?');
  if (!withoutQuery || withoutQuery === '/') return '/';
  return withoutQuery.replace(/\/$/, '') || '/';
}
