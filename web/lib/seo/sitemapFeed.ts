import { CITIES } from '@/lib/cities';
import { listBlogPosts, listEvents, listPosts, listProfiles, postSeo, profileSeo } from '@/lib/data';
import { editorialPaths } from '@/lib/seo/routes';
import { applyExclusions, type SitemapEntry } from '@/lib/seo/sitemapRules';
import { createAnonClient } from '@/lib/supabase';

export const SITEMAP_FILES = ['pages', 'cities', 'blog', 'posts', 'profiles', 'events'] as const;
export type SitemapFileName = (typeof SITEMAP_FILES)[number];
export type { SitemapEntry };

export type SitemapFile = {
  name: SitemapFileName;
  href: string;
  entries: SitemapEntry[];
};

export type SitemapCatalog = {
  files: SitemapFile[];
  excluded: string[];
  unpublishedCms: { slug: string; reason: string }[];
};

function unique(entries: SitemapEntry[]): SitemapEntry[] {
  const map = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    if (!entry.path.startsWith('/') || entry.path.startsWith('/admin') || entry.path.startsWith('/app')) continue;
    const prev = map.get(entry.path);
    if (!prev || (entry.lastmod && !prev.lastmod)) map.set(entry.path, entry);
  }
  return [...map.values()];
}

export async function listSitemapExclusions(): Promise<string[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client.from('web_sitemap_exclusions').select('path').order('path');
  if (error || !data) return [];
  return data.map((row) => String((row as { path: string }).path));
}

async function publishedCmsPages(): Promise<{ slug: string; updated_at: string | null }[]> {
  const client = createAnonClient();
  if (!client) return [];
  const { data, error } = await client.from('web_pages').select('slug, updated_at').eq('status', 'published');
  if (error || !data) return [];
  return data.map((row) => ({
    slug: String((row as { slug: string }).slug),
    updated_at: (row as { updated_at?: string | null }).updated_at ?? null,
  }));
}

/** Canlı XML ile admin listesi aynı kaynaktan gelir. Çıkarılan adresler dosyaya yazılmaz. */
export async function loadSitemapCatalog(): Promise<SitemapCatalog> {
  const [posts, profiles, events, blogs, cms, excludedList] = await Promise.all([
    listPosts({ limit: 200 }),
    listProfiles(200),
    listEvents({ limit: 200 }),
    listBlogPosts('tr', 200),
    publishedCmsPages(),
    listSitemapExclusions(),
  ]);
  const excluded = new Set(excludedList);
  const known = new Set(editorialPaths());
  const cmsLastmod = new Map<string, string | null>();
  const unpublishedCms: { slug: string; reason: string }[] = [];

  for (const page of cms) {
    const path = page.slug === 'home' ? '/' : `/${page.slug}`;
    if (known.has(path)) cmsLastmod.set(path, page.updated_at);
    else unpublishedCms.push({ slug: page.slug, reason: 'Bu slug için herkese açık bir sayfa yolu yok. XML’e 404 adresi yazılmaz.' });
  }

  const pages = editorialPaths()
    .filter((path) => !path.startsWith('/city/'))
    .map((path) => ({ path, lastmod: cmsLastmod.get(path) ?? null }));
  const cities = [
    '/cities',
    ...CITIES.map((city) => `/city/${city.id}`),
    ...CITIES.flatMap((city) => city.topics.map((topic) => `/city/${city.id}/${topic.slug}`)),
  ].map((path) => ({ path }));
  const blog = [
    { path: '/blog' },
    ...blogs
      .filter((post) => post.content.trim().length > 80 && post.seo_indexable)
      .map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updated_at })),
  ];
  const postEntries = posts
    .filter((post) => postSeo(post).index)
    .map((post) => ({ path: `/p/${post.id}`, lastmod: post.updated_at }));
  const profileEntries = profiles
    .filter((profile) => profileSeo(profile, posts.filter((post) => post.author_id === profile.id).length).index)
    .map((profile) => ({ path: `/u/${profile.username}`, lastmod: profile.created_at }));
  const eventEntries = [
    { path: '/events' },
    ...events
      .filter((event) => event.description.trim().length >= 80)
      .map((event) => ({ path: `/events/${event.id}`, lastmod: event.updated_at })),
  ];

  const grouped: Record<SitemapFileName, SitemapEntry[]> = {
    pages: applyExclusions(unique(pages), excluded),
    cities: applyExclusions(unique(cities), excluded),
    blog: applyExclusions(unique(blog), excluded),
    posts: applyExclusions(unique(postEntries), excluded),
    profiles: applyExclusions(unique(profileEntries), excluded),
    events: applyExclusions(unique(eventEntries), excluded),
  };

  return {
    files: SITEMAP_FILES.map((name) => ({
      name,
      href: `/sitemaps/${name}.xml`,
      entries: grouped[name],
    })),
    excluded: excludedList,
    unpublishedCms,
  };
}
