import { loadSitemapCatalog, type SitemapEntry } from '@/lib/seo/sitemapFeed';
import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod && !Number.isNaN(Date.parse(entry.lastmod))
        ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`
        : '';
      return `  <url><loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastmod}<changefreq>weekly</changefreq></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const fileName = name.replace(/\.xml$/, '') as 'pages' | 'cities' | 'blog' | 'posts' | 'profiles' | 'events';
  if (!isIndexableDeployment()) {
    return new Response(renderUrlSet([]), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }
  const catalog = await loadSitemapCatalog();
  const file = catalog.files.find((item) => item.name === fileName);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(renderUrlSet(file.entries), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
