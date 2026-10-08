import { SEO_LIMITS } from '@/features/seo/constants';
import { truncate } from '@/features/seo/text';
import type { SeoRecord, SiteConfig } from '@/features/seo/types';

/** MetadataBuilder — benzersiz, kısa, sayfanın gerçek içeriğinden. */
export function buildTitle(record: SeoRecord, config: SiteConfig, used: Set<string>): string {
  const raw = record.override?.seoTitle?.trim() || record.h1.trim() || config.defaultTitle;
  let title = raw.includes('|') ? raw : config.titleTemplate.replace('%s', raw);
  title = truncate(title, SEO_LIMITS.titleMax + 10);
  const key = title.toLocaleLowerCase('tr');
  if (used.has(key)) {
    title = truncate(`${raw} · ${record.id.slice(0, 6)} | Vora`, 70);
  }
  used.add(title.toLocaleLowerCase('tr'));
  return title;
}

export function buildDescription(record: SeoRecord, config: SiteConfig): string {
  const override = record.override?.seoDescription?.trim();
  if (override) return truncate(override, SEO_LIMITS.descriptionMax);
  const source = record.paragraphs.find((paragraph) => paragraph.trim().length >= 40) ?? record.paragraphs[0] ?? '';
  if (source.trim().length < 40) return '';
  return truncate(source, SEO_LIMITS.descriptionMax);
}

export function descriptionIsUsable(description: string): boolean {
  return description.trim().length >= 50;
}
