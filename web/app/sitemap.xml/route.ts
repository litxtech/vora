import { SITEMAP_FILES, loadSitemapCatalog } from '@/lib/seo/sitemapFeed';
import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export async function GET() {
  if (!isIndexableDeployment()) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`,
      { headers: { 'content-type': 'application/xml; charset=utf-8' } },
    );
  }
  const catalog = await loadSitemapCatalog();
  const names = SITEMAP_FILES.filter((name) => catalog.files.some((file) => file.name === name));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${names.map((name) => `  <sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${name}.xml`))}</loc></sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
