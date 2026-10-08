import { CITIES } from '@/lib/cities';
import { listBlogPosts, listEvents, listPosts, listProfiles, postSeo, profileSeo } from '@/lib/data';
import { editorialPaths } from '@/lib/seo/routes';
import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

function xml(entries: { path: string; lastmod?: string | null }[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod && !Number.isNaN(Date.parse(entry.lastmod))
        ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`
        : '';
      return `  <url><loc>${absoluteUrl(entry.path)}</loc>${lastmod}<changefreq>weekly</changefreq></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!isIndexableDeployment()) {
    return new Response(xml([]), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }
  let entries: { path: string; lastmod?: string | null }[] = [];
  if (name === 'pages.xml') {
    entries = editorialPaths().filter((path) => !path.startsWith('/city/')).map((path) => ({ path }));
  } else if (name === 'cities.xml') {
    entries = ['/cities', ...CITIES.map((city) => `/city/${city.id}`), ...CITIES.flatMap((city) => city.topics.map((topic) => `/city/${city.id}/${topic.slug}`))].map((path) => ({ path }));
  } else if (name === 'blog.xml') {
    const posts = await listBlogPosts('tr', 200);
    entries = [
      { path: '/blog' },
      ...posts.filter((post) => post.content.trim().length > 80 && post.seo_indexable).map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updated_at })),
    ];
  } else if (name === 'posts.xml') {
    const posts = await listPosts({ limit: 200 });
    entries = posts.filter((post) => postSeo(post).index).map((post) => ({ path: `/p/${post.id}`, lastmod: post.updated_at }));
  } else if (name === 'profiles.xml') {
    const profiles = await listProfiles(200);
    const posts = await listPosts({ limit: 200 });
    entries = profiles
      .filter((profile) => profileSeo(profile, posts.filter((post) => post.author_id === profile.id).length).index)
      .map((profile) => ({ path: `/u/${profile.username}`, lastmod: profile.created_at }));
  } else if (name === 'events.xml') {
    const events = await listEvents({ limit: 200 });
    entries = [
      { path: '/events' },
      ...events.filter((event) => event.description.trim().length >= 80).map((event) => ({ path: `/events/${event.id}`, lastmod: event.updated_at })),
    ];
  } else {
    return new Response('Not found', { status: 404 });
  }
  const unique = new Map<string, { path: string; lastmod?: string | null }>();
  for (const entry of entries) unique.set(entry.path, entry);
  return new Response(xml([...unique.values()]), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
