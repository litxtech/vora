import { PRIVATE_PATH_PREFIXES } from '@/features/seo/constants';
import { absoluteUrl } from '@/features/seo/siteConfig';
import type { SiteConfig } from '@/features/seo/types';

/** RobotsManager. robots.txt güvenlik sınırı değildir. */
export function buildRobotsTxt(config: SiteConfig): string {
  const lines = ['User-agent: *', 'Allow: /'];
  for (const prefix of PRIVATE_PATH_PREFIXES) {
    if (prefix.startsWith('/(')) continue;
    lines.push(`Disallow: ${prefix}`);
  }
  lines.push('Disallow: /ara');
  lines.push('');
  if (config.siteUrl) lines.push(`Sitemap: ${absoluteUrl(config, '/sitemap.xml')}`);
  return `${lines.join('\n')}\n`;
}
