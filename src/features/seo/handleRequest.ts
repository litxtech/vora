import { auditPages } from '@/features/seo/audit';
import { assembleCatalog, findByPath, searchRecords } from '@/features/seo/catalog';
import { buildRobotsTxt } from '@/features/seo/robots';
import { collapseRedirects } from '@/features/seo/redirect';
import { exploreSlice, resolveCatalog, resolvePage } from '@/features/seo/seoEngine';
import { buildSitemaps } from '@/features/seo/sitemap';
import { absoluteUrl } from '@/features/seo/siteConfig';
import { renderDocument } from '@/features/seo/html';
import { shortId } from '@/features/seo/text';
import { buildLocation, normalizeUrl } from '@/features/seo/url';
import { tombstoneDecision } from '@/features/seo/indexability';
import type { PublicSeoSource, SeoPage, SeoRecord, SiteConfig } from '@/features/seo/types';

export type SeoRequestDeps = {
  config: SiteConfig;
  source?: PublicSeoSource;
  loadSource?: () => Promise<PublicSeoSource>;
  now?: Date;
  auditToken?: string | null;
  cacheTtlMs?: number;
};

type CacheEntry = {
  at: number;
  source: PublicSeoSource;
  records: SeoRecord[];
  pages: SeoPage[];
};

let memoryCache: CacheEntry | null = null;

export function clearSeoCache(): void {
  memoryCache = null;
}

async function catalogFor(deps: SeoRequestDeps): Promise<CacheEntry> {
  const ttl = deps.cacheTtlMs ?? 120_000;
  if (deps.source) {
    const records = assembleCatalog(deps.source, deps.now ?? new Date());
    return { at: Date.now(), source: deps.source, records, pages: resolveCatalog(records, deps.config) };
  }
  if (memoryCache && Date.now() - memoryCache.at < ttl) return memoryCache;
  if (!deps.loadSource) throw new Error('seo_source_missing');
  const source = await deps.loadSource();
  const records = assembleCatalog(source, deps.now ?? new Date());
  memoryCache = { at: Date.now(), source, records, pages: resolveCatalog(records, deps.config) };
  return memoryCache;
}

function html(page: SeoPage, config: SiteConfig): Response {
  const cache =
    page.status !== 200
      ? 'no-store'
      : page.indexable
        ? 'public, max-age=300, stale-while-revalidate=600'
        : 'public, max-age=60';
  return new Response(renderDocument(page, config), {
    status: page.status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cache,
      'X-Robots-Tag': page.robots,
    },
  });
}

function redirect(location: string, status: 301 | 302): Response {
  return new Response(null, {
    status,
    headers: { Location: location, 'Cache-Control': 'public, max-age=300' },
  });
}

/** Public SEO HTTP yüzeyi. Aynı HTML tüm istemcilere gider. */
export async function handleSeoRequest(request: Request, deps: SeoRequestDeps): Promise<Response> {
  const url = new URL(request.url);
  const normalized = normalizeUrl(url);
  if (normalized.changed) {
    return redirect(absoluteUrl(deps.config, buildLocation(normalized.path, normalized.search)), 301);
  }

  let entry: CacheEntry;
  try {
    entry = await catalogFor(deps);
  } catch {
    const down = resolvePage({
      record: null,
      config: deps.config,
      context: { path: normalized.path, page: normalized.page, queryKeys: [], blockedFacet: false, qualityScore: 0 },
    });
    down.status = 503;
    down.h1 = 'Şu an ulaşılamıyor';
    down.robots = 'noindex, nofollow';
    down.indexable = false;
    down.inSitemap = false;
    return html(down, deps.config);
  }

  const redirects = collapseRedirects(entry.source.redirects);
  const hop = redirects.map.get(normalized.path);
  if (hop) return redirect(absoluteUrl(deps.config, hop.newPath), hop.redirectType);

  if (normalized.path === '/robots.txt') {
    return new Response(buildRobotsTxt(deps.config), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const sitemaps = buildSitemaps(entry.pages, deps.config);
  const sitemap = sitemaps.find((file) => file.path === normalized.path);
  if (sitemap) {
    return new Response(sitemap.xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  }

  if (normalized.path === '/api/seo/sitemap') {
    return Response.json({
      sitemap: absoluteUrl(deps.config, '/sitemap.xml'),
      robots: absoluteUrl(deps.config, '/robots.txt'),
      canonicalOrigin: deps.config.siteUrl,
      files: sitemaps.map((file) => file.path),
      indexable: entry.pages.filter((page) => page.indexable).length,
      noindex: entry.pages.filter((page) => page.status === 200 && !page.indexable).length,
    });
  }

  if (normalized.path === '/api/seo/audit') {
    if (!deps.auditToken || request.headers.get('authorization') !== `Bearer ${deps.auditToken}`) {
      return html(missing(deps, normalized.path, 404), deps.config);
    }
    const report = auditPages(entry.pages, entry.source.redirects);
    return Response.json({
      indexable: entry.pages.filter((page) => page.indexable).length,
      issues: report.issues,
      graph: report.graph,
    });
  }

  if (normalized.path === '/api/seo/page') {
    const target = url.searchParams.get('path') || '/';
    const page = pageFor(entry, deps, target, 1, new URLSearchParams(), false);
    if (!page) return html(missing(deps, target, 404), deps.config);
    return Response.json({
      path: page.path,
      status: page.status,
      title: page.title,
      description: page.description,
      canonical: page.canonical,
      robots: page.robots,
      h1: page.h1,
      indexable: page.indexable,
      inSitemap: page.inSitemap,
      score: page.score.total,
      schemaTypes: page.schemaTypes,
    });
  }

  const alias = aliasRedirect(entry.records, normalized.path);
  if (alias) return redirect(absoluteUrl(deps.config, alias), 301);

  const tombstone = tombstoneFor(entry.source, normalized.path);
  if (tombstone) {
    const decision = tombstoneDecision(tombstone.status, normalized.path);
    const page = missing(deps, normalized.path, decision.status);
    return html(page, deps.config);
  }

  const page = pageFor(entry, deps, normalized.path, normalized.page, url.searchParams, normalized.blockedFacet);
  if (!page) return html(missing(deps, normalized.path, 404), deps.config);
  return html(page, deps.config);
}

function pageFor(
  entry: CacheEntry,
  deps: SeoRequestDeps,
  path: string,
  pageNumber: number,
  searchParams: URLSearchParams,
  blockedFacet: boolean,
): SeoPage | null {
  const record = findByPath(entry.records, path);
  if (!record) return null;
  let extraLinks = record.links;
  let paragraphs = record.paragraphs;
  if (path === '/kesfet') {
    const slice = exploreSlice(entry.records, pageNumber);
    if (pageNumber > slice.pageCount) return null;
    extraLinks = slice.links;
    if (pageNumber > 1) extraLinks = [...extraLinks, { href: '/kesfet', text: 'İlk sayfa' }];
    if (pageNumber < slice.pageCount) extraLinks = [...extraLinks, { href: `/kesfet?page=${pageNumber + 1}`, text: 'Sonraki sayfa' }];
    if (pageNumber > 1) extraLinks = [...extraLinks, { href: `/kesfet?page=${pageNumber - 1}`, text: 'Önceki sayfa' }];
  }
  if (path === '/ara') {
    const query = searchParams.get('q')?.trim() ?? '';
    if (query.length >= 2) {
      const hits = searchRecords(entry.records, query);
      paragraphs = [
        hits.length > 0
          ? `“${query}” için ${hits.length} public sayfa bulundu. Arama sonuçları dizine eklenmez.`
          : `“${query}” için public sayfa bulunamadı.`,
      ];
      extraLinks = hits.map((hit) => ({ href: hit.path, text: hit.h1 }));
    }
  }
  return resolvePage({
    record,
    config: deps.config,
    extraLinks,
    paragraphs,
    context: {
      path,
      page: pageNumber,
      queryKeys: [...searchParams.keys()],
      blockedFacet,
      qualityScore: 0,
    },
  });
}

function aliasRedirect(records: SeoRecord[], path: string): string | null {
  const match = path.match(/^\/(p|etkinlik)\/([^/]+)$/);
  if (!match) return null;
  const kind = match[1] === 'p' ? 'post' : 'event';
  const token = match[2] ?? '';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const suffix = uuid ? shortId(token) : token.slice(-8);
  if (!/^[0-9a-f]{8}$/i.test(suffix)) return null;
  const found = records.find((record) => record.entityType === kind && shortId(record.id) === suffix.toLowerCase());
  if (!found || found.path === path) return null;
  return found.path;
}

function tombstoneFor(source: PublicSeoSource, path: string): { status: 'hidden' | 'removed' } | null {
  const match = path.match(/^\/(p|etkinlik)\/([^/]+)$/);
  if (!match) return null;
  const kind = match[1] === 'p' ? 'post' : 'event';
  const token = (match[2] ?? '').toLowerCase();
  const suffix = /^[0-9a-f-]{32,36}$/.test(token.replace(/-/g, '')) ? shortId(token) : token.slice(-8);
  return (
    source.tombstones.find((item) => item.kind === kind && shortId(item.id) === suffix) ?? null
  );
}

function missing(deps: SeoRequestDeps, path: string, status: 404 | 410): SeoPage {
  const page = resolvePage({
    record: null,
    config: deps.config,
    context: { path, page: 1, queryKeys: [], blockedFacet: false, qualityScore: 0 },
  });
  page.status = status;
  if (status === 410) {
    page.h1 = 'İçerik kaldırıldı';
    page.title = 'İçerik kaldırıldı | Vora';
    page.paragraphs = ['Bu içerik kaldırıldığı için artık yayında değil.'];
    page.reasons = ['deleted'];
  }
  return page;
}
