import { absoluteUrl } from '@/features/seo/siteConfig';
import type { SiteConfig } from '@/features/seo/types';

export type Crumb = { name: string; path: string };

/** BreadcrumbManager. JSON-LD ile aynı sıra. */
export function crumbsToJsonLd(crumbs: Crumb[], config: SiteConfig): Record<string, unknown> | null {
  if (crumbs.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(config, crumb.path),
    })),
  };
}
