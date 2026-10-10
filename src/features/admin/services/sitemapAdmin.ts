import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_SHARE_BASE_URL } from '@/constants/app';
import { supabase } from '@/lib/supabase/client';

const db = supabase as unknown as SupabaseClient;

export const SITEMAP_FILES = ['pages', 'cities', 'blog', 'posts', 'profiles', 'events'] as const;
export type SitemapFileName = (typeof SITEMAP_FILES)[number];

export type SitemapRow = { path: string; lastmod: string | null };

export type SitemapCatalog = {
  files: { name: SitemapFileName; entries: SitemapRow[] }[];
  excluded: string[];
  unpublishedCms: { slug: string; reason: string }[];
};

const PAGE_PATHS = [
  '/',
  '/about',
  '/features',
  '/cities',
  '/explore',
  '/discover',
  '/people',
  '/posts',
  '/blog',
  '/events',
  '/topics',
  '/city-leaders',
  '/download',
  '/help',
  '/contact',
  '/privacy',
  '/terms',
  '/community-rules',
  '/child-safety',
  '/account-deletion',
];

const FEATURE_SLUGS = [
  'cities',
  'discover',
  'people',
  'posts',
  'stories',
  'reels',
  'voice-rooms',
  'city-rooms',
  'council',
  'diplomacy',
  'events',
  'notifications',
  'messages',
];

const TOPIC_SLUGS = ['karadeniz', 'sosyal-yasam', 'gezi', 'arkadaslik', 'etkinlikler'];

const CITY_TOPICS: Record<string, string[]> = {
  trabzon: ['sosyal-yasam', 'gezilecek-yerler'],
  rize: ['sosyal-yasam', 'gezilecek-yerler'],
  artvin: ['gezilecek-yerler'],
  giresun: ['sosyal-yasam'],
  ordu: ['sosyal-yasam'],
  samsun: ['yeni-insanlarla-tanisma', 'etkinlikler'],
  sinop: [],
  kastamonu: [],
  bartin: [],
  karabuk: [],
  zonguldak: [],
  bolu: [],
  duzce: [],
  gumushane: ['gezilecek-yerler'],
  bayburt: [],
  amasya: [],
  corum: [],
  tokat: [],
};

function editorialPaths(): string[] {
  return [
    ...PAGE_PATHS,
    ...FEATURE_SLUGS.map((slug) => `/features/${slug}`),
    ...Object.entries(CITY_TOPICS).flatMap(([id, topics]) => [
      `/city/${id}`,
      ...topics.map((topic) => `/city/${id}/${topic}`),
    ]),
    ...TOPIC_SLUGS.map((slug) => `/topics/${slug}`),
  ];
}

function unique(entries: SitemapRow[]): SitemapRow[] {
  const map = new Map<string, SitemapRow>();
  for (const entry of entries) {
    if (!entry.path.startsWith('/') || entry.path.startsWith('/admin') || entry.path.startsWith('/app')) continue;
    const prev = map.get(entry.path);
    if (!prev || (entry.lastmod && !prev.lastmod)) map.set(entry.path, entry);
  }
  return [...map.values()];
}

function applyExclusions(entries: SitemapRow[], excluded: Set<string>): SitemapRow[] {
  return entries.filter((entry) => !excluded.has(entry.path));
}

function postIndexable(row: Record<string, unknown>): boolean {
  const text = String(row.content ?? '').trim();
  const title = typeof row.title === 'string' ? row.title : null;
  const media = Array.isArray(row.media_urls) ? row.media_urls.length : 0;
  const compact = text.replace(/\s+/g, '');
  const uniqueChars = new Set(compact.toLowerCase()).size;
  const lowEntropy = compact.length < 40 || uniqueChars < 8;
  const sentence = text.split(/[.!?\n]/)[0]?.trim() ?? '';
  return text.length >= 80 && !lowEntropy && Boolean(row.region_id) && Boolean(title?.trim() || sentence);
}

function profileIndexable(row: Record<string, unknown>, postCount: number): boolean {
  const bio = typeof row.bio === 'string' ? row.bio : null;
  return Boolean(row.web_search_visible) && (Boolean(bio?.trim()) || postCount > 0);
}

export async function loadAdminSitemapCatalog(): Promise<{ catalog: SitemapCatalog | null; error: string | null }> {
  const [posts, profiles, events, blogs, pages, exclusions] = await Promise.all([
    db.from('web_indexable_posts').select('id, content, title, media_urls, region_id, author_id, updated_at').order('created_at', { ascending: false }).limit(200),
    db.from('web_public_profiles').select('id, username, bio, web_search_visible, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('web_public_events').select('id, description, updated_at').order('starts_at', { ascending: false }).limit(200),
    db.from('web_blog_posts').select('slug, content, seo_indexable, updated_at').eq('status', 'published').eq('language', 'tr').order('published_at', { ascending: false }).limit(200),
    db.from('web_pages').select('slug, updated_at, status').eq('status', 'published'),
    db.from('web_sitemap_exclusions').select('path').order('path'),
  ]);

  const failed = [posts, profiles, events, blogs, pages, exclusions].find((result) => result.error);
  if (failed?.error) return { catalog: null, error: failed.error.message };

  const excludedList = ((exclusions.data ?? []) as { path: string }[]).map((row) => row.path);
  const excluded = new Set(excludedList);
  const known = new Set(editorialPaths());
  const cmsLastmod = new Map<string, string | null>();
  const unpublishedCms: { slug: string; reason: string }[] = [];
  for (const page of (pages.data ?? []) as { slug: string; updated_at: string | null }[]) {
    const path = page.slug === 'home' ? '/' : `/${page.slug}`;
    if (known.has(path)) cmsLastmod.set(path, page.updated_at);
    else unpublishedCms.push({ slug: page.slug, reason: 'Bu slug için herkese açık bir sayfa yolu yok. XML’e 404 adresi yazılmaz.' });
  }

  const postRows = (posts.data ?? []) as Record<string, unknown>[];
  const counts = new Map<string, number>();
  for (const post of postRows) {
    const authorId = String(post.author_id ?? '');
    counts.set(authorId, (counts.get(authorId) ?? 0) + 1);
  }

  const pageEntries = editorialPaths()
    .filter((path) => !path.startsWith('/city/'))
    .map((path) => ({ path, lastmod: cmsLastmod.get(path) ?? null }));
  const cityEntries = [
    '/cities',
    ...Object.entries(CITY_TOPICS).flatMap(([id, topics]) => [
      `/city/${id}`,
      ...topics.map((topic) => `/city/${id}/${topic}`),
    ]),
  ].map((path) => ({ path, lastmod: null }));
  const blogEntries = [
    { path: '/blog', lastmod: null },
    ...((blogs.data ?? []) as { slug: string; content: string; seo_indexable: boolean; updated_at: string | null }[])
      .filter((post) => String(post.content ?? '').trim().length > 80 && post.seo_indexable)
      .map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updated_at })),
  ];
  const postEntries = postRows
    .filter(postIndexable)
    .map((post) => ({ path: `/p/${String(post.id)}`, lastmod: typeof post.updated_at === 'string' ? post.updated_at : null }));
  const profileEntries = ((profiles.data ?? []) as Record<string, unknown>[])
    .filter((profile) => profileIndexable(profile, counts.get(String(profile.id)) ?? 0))
    .map((profile) => ({
      path: `/u/${String(profile.username)}`,
      lastmod: typeof profile.created_at === 'string' ? profile.created_at : null,
    }));
  const eventEntries = [
    { path: '/events', lastmod: null },
    ...((events.data ?? []) as { id: string; description: string; updated_at: string | null }[])
      .filter((event) => String(event.description ?? '').trim().length >= 80)
      .map((event) => ({ path: `/events/${event.id}`, lastmod: event.updated_at })),
  ];

  const grouped: Record<SitemapFileName, SitemapRow[]> = {
    pages: applyExclusions(unique(pageEntries), excluded),
    cities: applyExclusions(unique(cityEntries), excluded),
    blog: applyExclusions(unique(blogEntries), excluded),
    posts: applyExclusions(unique(postEntries), excluded),
    profiles: applyExclusions(unique(profileEntries), excluded),
    events: applyExclusions(unique(eventEntries), excluded),
  };

  return {
    catalog: {
      files: SITEMAP_FILES.map((name) => ({ name, entries: grouped[name] })),
      excluded: excludedList,
      unpublishedCms,
    },
    error: null,
  };
}

export type LiveSitemapStatus = 'flowing' | 'empty' | 'unreachable';

export type LiveSitemapFile = {
  name: SitemapFileName;
  url: string;
  count: number;
};

export type LiveSitemapProbe = {
  indexUrl: string;
  publicIndexUrl: string | null;
  status: LiveSitemapStatus;
  liveCount: number;
  files: LiveSitemapFile[];
  checkedAt: string;
  detail: string;
};

const SITEMAP_ORIGINS = [
  'https://www.vorakaradeniz.com',
  'https://vorakaradeniz.com',
  'https://voraweb-litxtechcom.vercel.app',
  APP_SHARE_BASE_URL.replace(/\/$/, ''),
];

export function sitemapSiteOrigin(): string {
  return SITEMAP_ORIGINS[0];
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
}

function isSitemapXml(text: string): boolean {
  return text.includes('<urlset') || text.includes('<sitemapindex');
}

async function readXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/xml,text/xml' } });
    if (!response.ok) return null;
    const text = await response.text();
    return isSitemapXml(text) ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** XML’i gerçekten döndüren adresi bulur. vora.app bu dosyayı sunmuyor. */
export async function probeLiveSitemap(): Promise<LiveSitemapProbe> {
  const checkedAt = new Date().toISOString();
  let indexUrl = `${sitemapSiteOrigin()}/sitemap.xml`;
  let indexXml: string | null = null;
  for (const origin of SITEMAP_ORIGINS) {
    const candidate = `${origin}/sitemap.xml`;
    const xml = await readXml(candidate);
    if (xml) {
      indexUrl = candidate;
      indexXml = xml;
      break;
    }
  }

  if (indexXml == null) {
    return {
      indexUrl,
      publicIndexUrl: null,
      status: 'unreachable',
      liveCount: 0,
      files: [],
      checkedAt,
      detail: 'Canlı XML adresine ulaşılamadı.',
    };
  }

  const servingOrigin = originOf(indexUrl) ?? sitemapSiteOrigin();
  const indexLocs = locs(indexXml);
  const publicOrigin = originOf(indexLocs[0] ?? '') ;
  const publicIndexUrl = publicOrigin && publicOrigin !== servingOrigin ? `${publicOrigin}/sitemap.xml` : null;
  const linked = SITEMAP_FILES.filter((name) => indexLocs.some((loc) => loc.includes(`/sitemaps/${name}.xml`)));
  const names = linked.length > 0 ? linked : [...SITEMAP_FILES];
  const files = await Promise.all(
    names.map(async (name) => {
      const url = `${servingOrigin}/sitemaps/${name}.xml`;
      const xml = await readXml(url);
      const count = xml == null ? 0 : locs(xml).filter((loc) => !loc.endsWith('.xml')).length;
      return { name, url, count };
    }),
  );
  const liveCount = files.reduce((sum, file) => sum + file.count, 0);
  const domainNote = publicIndexUrl
    ? ` Dosyanın içindeki adresler ${publicOrigin} yazıyor; o alan adı bu XML’i açmıyor.`
    : '';
  if (liveCount === 0) {
    return {
      indexUrl,
      publicIndexUrl,
      status: 'empty',
      liveCount: 0,
      files,
      checkedAt,
      detail: `Site cevap veriyor. Canlı XML içinde adres yok.${domainNote}`,
    };
  }
  return {
    indexUrl,
    publicIndexUrl,
    status: 'flowing',
    liveCount,
    files,
    checkedAt,
    detail: `Canlı XML ${liveCount} adres döndürüyor.${domainNote}`,
  };
}

export async function setAdminSitemapExclusion(path: string, excluded: boolean): Promise<string | null> {
  if (!path.startsWith('/') || path.includes('?') || path.includes('//') || path.length > 200) {
    return 'Adres kökten başlamalı ve soru işareti içermemeli.';
  }
  const result = excluded
    ? await db.from('web_sitemap_exclusions').upsert({ path }, { onConflict: 'path' })
    : await db.from('web_sitemap_exclusions').delete().eq('path', path);
  return result.error?.message ?? null;
}
