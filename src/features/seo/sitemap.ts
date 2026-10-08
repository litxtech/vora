import { SITEMAP_CHANGE_FREQ, SITEMAP_PRIORITY, SEO_LIMITS } from '@/features/seo/constants';
import { isoDate } from '@/features/seo/text';
import { absoluteUrl } from '@/features/seo/siteConfig';
import type { SeoEntityType, SeoPage, SiteConfig } from '@/features/seo/types';

export type SitemapFile = {
  path: string;
  xml: string;
};

const GROUPS: { key: string; types: SeoEntityType[] }[] = [
  { key: 'pages', types: ['home', 'static'] },
  { key: 'cities', types: ['city', 'city_intent'] },
  { key: 'blog', types: ['blog'] },
  { key: 'posts', types: ['post'] },
  { key: 'profiles', types: ['profile'] },
  { key: 'events', types: ['event'] },
  { key: 'topics', types: ['topic'] },
];

function xmlEscape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function urlSet(pages: SeoPage[], config: SiteConfig): string {
  const body = pages
    .map((page) => {
      const lastmod = isoDate(page.updatedAt);
      const lines = [
        '  <url>',
        `    <loc>${xmlEscape(absoluteUrl(config, page.path))}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        `    <changefreq>${SITEMAP_CHANGE_FREQ[page.entityType]}</changefreq>`,
        `    <priority>${SITEMAP_PRIORITY[page.entityType].toFixed(1)}</priority>`,
        '  </url>',
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function imageSet(pages: SeoPage[], config: SiteConfig): string {
  const body = pages
    .filter((page) => page.images.length > 0)
    .map((page) => {
      const images = page.images
        .map(
          (image) =>
            `    <image:image><image:loc>${xmlEscape(image.url)}</image:loc><image:title>${xmlEscape(image.alt)}</image:title></image:image>`,
        )
        .join('\n');
      return `  <url>\n    <loc>${xmlEscape(absoluteUrl(config, page.path))}</loc>\n${images}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

/** SitemapManager. Yalnızca indexable sayfalar. lastmod updatedAt’ten gelir. */
export function buildSitemaps(pages: SeoPage[], config: SiteConfig): SitemapFile[] {
  const indexable = pages.filter((page) => page.inSitemap && page.indexable && page.status === 200);
  const files: SitemapFile[] = [];

  for (const group of GROUPS) {
    const rows = indexable.filter((page) => group.types.includes(page.entityType));
    if (rows.length === 0) continue;
    const chunks = Math.ceil(rows.length / SEO_LIMITS.sitemapChunk);
    for (let index = 0; index < chunks; index += 1) {
      const slice = rows.slice(index * SEO_LIMITS.sitemapChunk, (index + 1) * SEO_LIMITS.sitemapChunk);
      const suffix = chunks > 1 ? `-${index + 1}` : '';
      files.push({
        path: `/sitemaps/${group.key}${suffix}.xml`,
        xml: urlSet(slice, config),
      });
    }
  }

  const withImages = indexable.filter((page) => page.images.length > 0);
  if (withImages.length > 0) {
    files.push({ path: '/sitemaps/images.xml', xml: imageSet(withImages, config) });
  }

  const indexBody = files
    .map((file) => `  <sitemap><loc>${xmlEscape(absoluteUrl(config, file.path))}</loc></sitemap>`)
    .join('\n');
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexBody}\n</sitemapindex>\n`;
  return [{ path: '/sitemap.xml', xml: index }, ...files];
}
