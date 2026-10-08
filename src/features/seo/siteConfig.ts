import type { SeoLocale, SiteConfig } from '@/features/seo/types';

const LOCALES: SeoLocale[] = ['tr', 'en', 'de', 'fr', 'es', 'ar'];

function cleanOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function cleanUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type SiteConfigInput = {
  publicSiteUrl?: string | null;
  shareBaseUrl?: string | null;
  fallbackOrigin?: string | null;
  defaultOgImage?: string | null;
  twitterHandle?: string | null;
  organizationLogo?: string | null;
  iosStoreUrl?: string | null;
  androidStoreUrl?: string | null;
  sameAs?: string[] | null;
  privacyPolicyUrl?: string | null;
  termsUrl?: string | null;
  supportedLocales?: string[] | null;
};

/**
 * Üretim adresi env’den gelir. Motorun içinde sabit domain yoktur.
 * Çevirisi olmayan diller supportedLocales içine alınmaz.
 */
export function resolveSiteConfig(input: SiteConfigInput): SiteConfig {
  const siteUrl =
    cleanOrigin(input.publicSiteUrl) ??
    cleanOrigin(input.shareBaseUrl) ??
    cleanOrigin(input.fallbackOrigin) ??
    '';

  const requested = (input.supportedLocales ?? ['tr']).filter((locale): locale is SeoLocale =>
    LOCALES.includes(locale as SeoLocale),
  );
  const supportedLocales = requested.length > 0 ? requested : (['tr'] as SeoLocale[]);

  return {
    siteName: 'Vora',
    siteUrl,
    defaultTitle: 'Vora | Karadeniz sosyal uygulaması',
    titleTemplate: '%s | Vora',
    defaultDescription:
      'Vora, Karadeniz şehirlerindeki insanların public paylaşımlarını, etkinliklerini ve topluluklarını keşfetmen için bir sosyal uygulamadır.',
    defaultOgImage: cleanUrl(input.defaultOgImage),
    twitterHandle: input.twitterHandle?.trim().replace(/^@/, '') || null,
    organizationName: 'Vora',
    organizationLogo: cleanUrl(input.organizationLogo) ?? cleanUrl(input.defaultOgImage),
    defaultLocale: supportedLocales[0] ?? 'tr',
    supportedLocales,
    iosStoreUrl: cleanUrl(input.iosStoreUrl),
    androidStoreUrl: cleanUrl(input.androidStoreUrl),
    sameAs: (input.sameAs ?? []).map((url) => cleanUrl(url)).filter((url): url is string => Boolean(url)),
    privacyPolicyUrl: cleanUrl(input.privacyPolicyUrl),
    termsUrl: cleanUrl(input.termsUrl),
  };
}

export function absoluteUrl(config: SiteConfig, path: string): string {
  if (!config.siteUrl) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${config.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
