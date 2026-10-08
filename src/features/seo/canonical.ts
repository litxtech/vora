import { absoluteUrl } from '@/features/seo/siteConfig';
import type { IndexDecision, SeoRecord, SiteConfig } from '@/features/seo/types';

/** CanonicalManager — indexlenen URL kendi kendine işaret eder. Query canonical’a girmez. */
export function buildCanonical(
  record: SeoRecord | null,
  decision: IndexDecision,
  config: SiteConfig,
): string {
  const override = record?.override?.seoCanonical?.trim();
  if (override && (override.startsWith('/') || override.startsWith('http'))) {
    return override.startsWith('http') ? override.split('?')[0] ?? override : absoluteUrl(config, override.split('?')[0] ?? override);
  }
  const path = decision.canonicalPath.split('?')[0] || '/';
  return absoluteUrl(config, path);
}
