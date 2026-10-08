import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

export const dynamic = 'force-dynamic';

const NAMES = ['pages', 'cities', 'blog', 'posts', 'profiles', 'events'] as const;

export async function GET() {
  const body = isIndexableDeployment()
    ? `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${NAMES.map((name) => `  <sitemap><loc>${absoluteUrl(`/sitemaps/${name}.xml`)}</loc></sitemap>`).join('\n')}
</sitemapindex>`
    : `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
