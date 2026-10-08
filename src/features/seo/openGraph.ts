import type { SeoImage, SeoPage, SiteConfig } from '@/features/seo/types';

/** OpenGraphManager + Twitter kartı. Görsel yoksa marka yedeği, o da yoksa alan yazılmaz. */
export function buildOpenGraph(page: Pick<SeoPage, 'title' | 'description' | 'canonical' | 'entityType'>, image: SeoImage | null, config: SiteConfig): {
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
} {
  const ogImage = image?.url || config.defaultOgImage;
  const type = page.entityType === 'blog' || page.entityType === 'post' ? 'article' : 'website';
  const openGraph: Record<string, string> = {
    'og:title': page.title,
    'og:description': page.description || config.defaultDescription,
    'og:url': page.canonical,
    'og:type': type,
    'og:site_name': config.siteName,
    'og:locale': 'tr_TR',
  };
  if (ogImage) openGraph['og:image'] = ogImage;

  const twitter: Record<string, string> = {
    'twitter:card': ogImage ? 'summary_large_image' : 'summary',
    'twitter:title': page.title,
    'twitter:description': page.description || config.defaultDescription,
  };
  if (ogImage) twitter['twitter:image'] = ogImage;
  if (config.twitterHandle) twitter['twitter:site'] = `@${config.twitterHandle}`;
  return { openGraph, twitter };
}
