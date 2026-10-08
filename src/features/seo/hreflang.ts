import { absoluteUrl } from '@/features/seo/siteConfig';
import type { SeoRecord, SiteConfig } from '@/features/seo/types';

const VALID = new Set(['tr', 'en', 'de', 'fr', 'es', 'ar', 'x-default']);

/**
 * HreflangManager.
 * Yalnızca gerçekten var olan eşdeğer dil sürümleri. Çeviri yoksa tek dil + x-default.
 */
export function buildHreflang(record: SeoRecord, config: SiteConfig): { hreflang: string; href: string }[] {
  const alternates = record.alternates.filter(
    (item) => VALID.has(item.locale) && config.supportedLocales.includes(item.locale),
  );
  if (alternates.length === 0) {
    const href = absoluteUrl(config, record.path);
    return [
      { hreflang: config.defaultLocale, href },
      { hreflang: 'x-default', href },
    ];
  }
  const links = alternates.map((item) => ({
    hreflang: item.locale,
    href: absoluteUrl(config, item.path),
  }));
  const fallback = links.find((item) => item.hreflang === config.defaultLocale) ?? links[0];
  if (fallback && !links.some((item) => item.hreflang === 'x-default')) {
    links.push({ hreflang: 'x-default', href: fallback.href });
  }
  return links;
}

export function hreflangIssues(links: { hreflang: string; href: string }[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (!VALID.has(link.hreflang)) issues.push('invalid_hreflang');
    if (!link.href.startsWith('http')) issues.push('hreflang_not_absolute');
    if (seen.has(link.hreflang)) issues.push('duplicate_hreflang');
    seen.add(link.hreflang);
  }
  if (!seen.has('x-default') && links.length > 0) issues.push('missing_x_default');
  return issues;
}
