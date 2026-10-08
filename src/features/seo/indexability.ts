import { PRIVATE_PATH_PREFIXES, SEO_LIMITS } from '@/features/seo/constants';
import type { IndexDecision, SeoRecord } from '@/features/seo/types';

export type IndexContext = {
  path: string;
  page: number;
  queryKeys: string[];
  blockedFacet: boolean;
  qualityScore: number;
};

/**
 * IndexabilityManager
 * Public + approved + quality → index.
 * Private, deleted, admin, search, thin ve spam → noindex veya 404/410.
 */
export function decideIndexability(record: SeoRecord | null, context: IndexContext): IndexDecision {
  const reasons: string[] = [];
  const canonicalPath = record?.hints.duplicateOfPath || record?.path || context.path;

  if (PRIVATE_PATH_PREFIXES.some((prefix) => context.path === prefix || context.path.startsWith(`${prefix}/`))) {
    return blocked(context.path, ['private_route']);
  }

  if (!record) {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, nofollow',
      follow: false,
      status: 404,
      reasons: ['missing'],
      canonicalPath: context.path,
    };
  }

  if (record.hints.deleted || record.hints.moderation === 'deleted') {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, nofollow',
      follow: false,
      status: 410,
      reasons: ['deleted'],
      canonicalPath: record.path,
    };
  }

  if (record.hints.moderation === 'hidden' || record.hints.moderation === 'rejected') {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, nofollow',
      follow: false,
      status: 404,
      reasons: [record.hints.moderation],
      canonicalPath: record.path,
    };
  }

  if (record.hints.visibility !== 'public') {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, nofollow',
      follow: false,
      status: 404,
      reasons: ['private_visibility'],
      canonicalPath: record.path,
    };
  }

  const noindex = (reason: string, status: 200 | 404 | 410 = 200): IndexDecision => ({
    indexable: false,
    inSitemap: false,
    robots: 'noindex, follow',
    follow: true,
    status,
    reasons: [reason],
    canonicalPath,
  });

  if (record.hints.moderation === 'draft' || record.hints.moderation === 'pending') {
    return noindex(record.hints.moderation, 404);
  }

  if (context.path === '/ara' || context.queryKeys.includes('q')) reasons.push('search_results');
  if (context.page > 1) reasons.push('pagination');
  if (context.blockedFacet || context.queryKeys.some((key) => key === 'gender' || key === 'online' || key === 'filter' || key === 'sort')) {
    reasons.push('filtered_results');
  }
  if (record.override?.seoNoindex) reasons.push('override_noindex');
  if (record.hints.sensitive) reasons.push('sensitive');
  if (record.hints.spam) reasons.push('spam');
  if (record.hints.duplicateOfPath) reasons.push('duplicate');
  if (!record.hints.meaningful) reasons.push('thin_content');

  if (record.entityType === 'profile') {
    if (!record.hints.searchEnginesAllowed) reasons.push('search_engines_disabled');
    if (!record.hints.authorPublic) reasons.push('author_not_public');
  }

  if (record.entityType === 'post' || record.entityType === 'topic') {
    if (!record.hints.authorPublic && record.entityType === 'post') reasons.push('author_not_public');
    if (context.qualityScore < SEO_LIMITS.qualityIndexThreshold) reasons.push('quality_below_threshold');
  }

  if (record.entityType === 'city' || record.entityType === 'city_intent' || record.entityType === 'event' || record.entityType === 'blog') {
    if (!record.hints.meaningful) reasons.push('not_meaningful');
    if (context.qualityScore < 40 && record.entityType !== 'blog') reasons.push('quality_below_threshold');
  }

  if (reasons.length > 0) {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, follow',
      follow: true,
      status: 200,
      reasons: [...new Set(reasons)],
      canonicalPath: record.hints.duplicateOfPath ?? (context.page > 1 ? record.path : record.path),
    };
  }

  return {
    indexable: true,
    inSitemap: true,
    robots: 'index, follow',
    follow: true,
    status: 200,
    reasons: ['public_approved_quality'],
    canonicalPath: record.path,
  };
}

function blocked(path: string, reasons: string[]): IndexDecision {
  return {
    indexable: false,
    inSitemap: false,
    robots: 'noindex, nofollow',
    follow: false,
    status: 404,
    reasons,
    canonicalPath: path,
  };
}

export function tombstoneDecision(status: 'hidden' | 'removed', path: string): IndexDecision {
  if (status === 'removed') {
    return {
      indexable: false,
      inSitemap: false,
      robots: 'noindex, nofollow',
      follow: false,
      status: 410,
      reasons: ['deleted'],
      canonicalPath: path,
    };
  }
  return {
    indexable: false,
    inSitemap: false,
    robots: 'noindex, nofollow',
    follow: false,
    status: 404,
    reasons: ['hidden'],
    canonicalPath: path,
  };
}
