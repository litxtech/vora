import { SEO_LIMITS } from '@/features/seo/constants';
import { readableText, spamSignals } from '@/features/seo/text';
import type { SeoPage, SeoRecord, SeoScore } from '@/features/seo/types';

/** SeoQualityManager — içerik tamamlığı, spam, okunabilirlik. Sahte etkileşim yok. */
export function scoreContentQuality(record: Pick<SeoRecord, 'paragraphs' | 'sections' | 'images' | 'h1' | 'entityType'>): {
  score: number;
  spam: boolean;
  meaningful: boolean;
} {
  const text = [
    record.h1,
    ...record.paragraphs,
    ...record.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
  ].join('\n');
  const signals = spamSignals(text).filter((signal) => signal !== 'empty');
  const spam = signals.length > 0;
  const chars = text.trim().length;
  let score = 0;
  if (record.h1.trim().length >= 8) score += 15;
  if (chars >= SEO_LIMITS.postMinChars) score += 25;
  else if (chars >= 40) score += 10;
  if (readableText(text)) score += 20;
  if (!spam && chars >= 40) score += 20;
  if (record.images.length > 0 && record.images.every((image) => image.alt.trim().length > 0)) score += 10;
  if (record.sections.length > 0) score += 10;
  if (spam) score = Math.max(0, score - 40);
  const minimum = record.entityType === 'profile' ? SEO_LIMITS.profileMinBioChars : record.entityType === 'post' ? SEO_LIMITS.postMinChars : 40;
  const meaningful = !spam && chars >= minimum && (record.entityType !== 'post' || readableText(text));
  return { score: Math.max(0, Math.min(100, score)), spam, meaningful };
}

export function postTextEligible(text: string): { spam: boolean; sensitiveReady: boolean; longEnough: boolean } {
  const signals = spamSignals(text).filter((signal) => signal !== 'empty');
  return {
    spam: signals.length > 0,
    sensitiveReady: true,
    longEnough: text.trim().length >= SEO_LIMITS.postMinChars && readableText(text),
  };
}

/** Sayfa SEO skoru 0–100. Ağırlıklar sabit. */
export function scoreSeoPage(page: Pick<
  SeoPage,
  | 'title'
  | 'description'
  | 'h1'
  | 'canonical'
  | 'robots'
  | 'indexable'
  | 'wordCount'
  | 'links'
  | 'images'
  | 'schemaTypes'
  | 'status'
>): SeoScore {
  let technical = 0;
  if (page.status === 200 || page.status === 404 || page.status === 410) technical += 10;
  if (page.canonical.startsWith('http')) technical += 8;
  if (page.h1.trim()) technical += 7;

  let content = 0;
  if (page.wordCount >= 40) content += 12;
  if (page.wordCount >= 80) content += 8;
  if (page.images.every((image) => image.alt.trim())) content += 5;

  let indexability = 0;
  if (page.robots.includes('noindex') || page.robots.includes('index')) indexability += 8;
  if (!(page.robots.includes('noindex') && page.indexable)) indexability += 7;

  const internal = page.links.filter((link) => link.href.startsWith('/')).length;
  const internalLinks = Math.min(15, internal >= 3 ? 15 : internal * 5);

  let metadata = 0;
  if (page.title.trim().length >= 10 && page.title.length <= 70) metadata += 5;
  if (page.description.trim().length >= 50 && page.description.length <= 170) metadata += 5;

  const structuredData = page.schemaTypes.length > 0 ? 10 : 0;
  const quality = Math.round((content / 25) * 100);

  const total = Math.max(0, Math.min(100, technical + content + indexability + internalLinks + metadata + structuredData));
  return {
    total,
    technical,
    content,
    indexability,
    internalLinks,
    metadata,
    structuredData,
    quality,
  };
}
