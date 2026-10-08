import { buildCanonical } from '@/features/seo/canonical';
import { SEO_LIMITS } from '@/features/seo/constants';
import { buildHreflang } from '@/features/seo/hreflang';
import { decideIndexability, type IndexContext } from '@/features/seo/indexability';
import { buildDescription, buildTitle, descriptionIsUsable } from '@/features/seo/metadata';
import { buildOpenGraph } from '@/features/seo/openGraph';
import { scoreContentQuality, scoreSeoPage } from '@/features/seo/quality';
import { absoluteUrl } from '@/features/seo/siteConfig';
import { buildJsonLd } from '@/features/seo/structuredData';
import { wordCount } from '@/features/seo/text';
import type { SeoPage, SeoRecord, SiteConfig } from '@/features/seo/types';

export type ResolveInput = {
  record: SeoRecord | null;
  config: SiteConfig;
  context: IndexContext;
  usedTitles?: Set<string>;
  extraLinks?: { href: string; text: string }[];
  paragraphs?: string[];
};

/** SeoEngine — metadata, index, canonical, şema ve skoru tek sayfada birleştirir. */
export function resolvePage(input: ResolveInput): SeoPage {
  const usedTitles = input.usedTitles ?? new Set<string>();
  const record = input.record;
  const quality = record ? scoreContentQuality(record) : { score: 0, spam: false, meaningful: false };
  const decision = decideIndexability(record, { ...input.context, qualityScore: quality.score });

  if (!record || decision.status !== 200) {
    const missing = decision.status === 410;
    return emptyPage(input.config, input.context.path, decision.status, missing);
  }

  let title = buildTitle(record, input.config, usedTitles);
  let description = buildDescription(record, input.config);
  if (!descriptionIsUsable(description) && decision.indexable) {
    decision.indexable = false;
    decision.inSitemap = false;
    decision.robots = 'noindex, follow';
    decision.reasons = [...decision.reasons, 'description_too_thin'];
  }

  const paragraphs = input.paragraphs ?? record.paragraphs;
  const links = [...record.links, ...(input.extraLinks ?? [])].filter(
    (link, index, all) => all.findIndex((item) => item.href === link.href) === index,
  );
  const canonical = buildCanonical(record, decision, input.config);
  const draft: SeoPage = {
    entityType: record.entityType,
    entityId: record.id,
    path: input.context.page > 1 ? `${record.path}?page=${input.context.page}` : record.path,
    absoluteUrl: absoluteUrl(input.config, record.path),
    status: 200,
    h1: record.h1,
    title,
    description: description || input.config.defaultDescription,
    robots: decision.robots,
    canonical,
    indexable: decision.indexable,
    inSitemap: decision.inSitemap && input.context.page <= 1,
    reasons: decision.reasons,
    paragraphs,
    sections: record.sections.map((section) => ({ ...section, links: [] })),
    breadcrumbs: record.breadcrumbs,
    links,
    images: record.images,
    video: record.video,
    jsonLd: [],
    openGraph: {},
    twitter: {},
    hreflang: buildHreflang(record, input.config),
    score: {
      total: 0,
      technical: 0,
      content: 0,
      indexability: 0,
      internalLinks: 0,
      metadata: 0,
      structuredData: 0,
      quality: quality.score,
    },
    wordCount: wordCount([record.h1, ...paragraphs, ...record.sections.flatMap((section) => section.paragraphs)]),
    schemaTypes: [],
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    authorName: record.author?.name ?? null,
    cityName: record.city?.name ?? null,
  };

  if (decision.indexable) {
    const structured = buildJsonLd(record, draft, input.config);
    draft.jsonLd = structured.blocks;
    draft.schemaTypes = structured.types;
  }
  const social = buildOpenGraph(draft, record.images[0] ?? null, input.config);
  draft.openGraph = social.openGraph;
  draft.twitter = social.twitter;
  draft.score = scoreSeoPage(draft);
  draft.score.quality = quality.score;
  return draft;
}

export function resolveCatalog(records: SeoRecord[], config: SiteConfig): SeoPage[] {
  const usedTitles = new Set<string>();
  return records.map((record) =>
    resolvePage({
      record,
      config,
      usedTitles,
      context: { path: record.path, page: 1, queryKeys: record.path === '/ara' ? ['q'] : [], blockedFacet: false, qualityScore: 0 },
    }),
  );
}

function emptyPage(config: SiteConfig, path: string, status: 404 | 410 | 200, removed: boolean): SeoPage {
  const h1 = removed ? 'İçerik kaldırıldı' : 'Sayfa bulunamadı';
  const canonical = absoluteUrl(config, path);
  return {
    entityType: 'static',
    entityId: removed ? 'gone' : 'not-found',
    path,
    absoluteUrl: canonical,
    status: status === 200 ? 404 : status,
    h1,
    title: `${h1} | Vora`,
    description: removed
      ? 'Bu içerik kaldırıldığı için artık yayında değil.'
      : 'Aradığın sayfa Vora’da yok. Şehirler ve public içerikler ana sayfadan ulaşılır.',
    robots: 'noindex, nofollow',
    canonical,
    indexable: false,
    inSitemap: false,
    reasons: [removed ? 'deleted' : 'missing'],
    paragraphs: [
      removed
        ? 'Bu kayıt silindi veya yayından kaldırıldı.'
        : 'Bağlantı hatalı olabilir ya da içerik hiç yayınlanmamış olabilir.',
    ],
    sections: [],
    breadcrumbs: [
      { name: 'Vora', path: '/' },
      { name: h1, path },
    ],
    links: [
      { href: '/', text: 'Ana sayfa' },
      { href: '/sehirler', text: 'Şehirler' },
      { href: '/kesfet', text: 'Keşfet' },
    ],
    images: [],
    video: null,
    jsonLd: [],
    openGraph: {},
    twitter: {},
    hreflang: [],
    score: {
      total: 0,
      technical: 25,
      content: 0,
      indexability: 15,
      internalLinks: 0,
      metadata: 0,
      structuredData: 0,
      quality: 0,
    },
    wordCount: 12,
    schemaTypes: [],
    updatedAt: new Date(0).toISOString(),
    publishedAt: null,
    authorName: null,
    cityName: null,
  };
}

export function exploreSlice(records: SeoRecord[], page: number): { links: { href: string; text: string }[]; pageCount: number } {
  const posts = records.filter((record) => record.entityType === 'post' && record.hints.meaningful && !record.hints.duplicateOfPath);
  const pageCount = Math.max(1, Math.ceil(posts.length / SEO_LIMITS.explorePageSize));
  const start = (page - 1) * SEO_LIMITS.explorePageSize;
  const links = posts.slice(start, start + SEO_LIMITS.explorePageSize).map((post) => ({ href: post.path, text: post.h1 }));
  return { links, pageCount };
}
