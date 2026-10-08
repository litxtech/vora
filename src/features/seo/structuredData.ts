import { crumbsToJsonLd } from '@/features/seo/breadcrumb';
import { absoluteUrl } from '@/features/seo/siteConfig';
import type { SeoPage, SeoRecord, SiteConfig } from '@/features/seo/types';

function compact(node: Record<string, unknown>): Record<string, unknown> | null {
  const entries = Object.entries(node).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

/**
 * StructuredDataManager.
 * Zorunlu alan yoksa şema üretilmez. Puan, yorum sayısı ve fiyat uydurulmaz.
 */
export function buildJsonLd(record: SeoRecord, page: Pick<SeoPage, 'title' | 'description' | 'canonical' | 'breadcrumbs' | 'h1'>, config: SiteConfig): {
  blocks: Record<string, unknown>[];
  types: string[];
} {
  const graph: Record<string, unknown>[] = [];
  const orgId = absoluteUrl(config, '/#organization');
  const siteId = absoluteUrl(config, '/#website');

  if (record.entityType === 'home') {
    const organization = compact({
      '@type': 'Organization',
      '@id': orgId,
      name: config.organizationName,
      url: config.siteUrl || undefined,
      logo: config.organizationLogo,
      sameAs: config.sameAs.length > 0 ? config.sameAs : undefined,
    });
    const website = compact({
      '@type': 'WebSite',
      '@id': siteId,
      name: config.siteName,
      url: config.siteUrl || undefined,
      publisher: { '@id': orgId },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${absoluteUrl(config, '/ara')}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
    if (organization) graph.push(organization);
    if (website && config.siteUrl) graph.push(website);

    const app = compact({
      '@type': 'SoftwareApplication',
      name: config.siteName,
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'iOS, Android',
      description: config.defaultDescription,
      url: absoluteUrl(config, '/indir'),
    });
    if (app) graph.push(app);
  }

  const pageNode = compact({
    '@type': record.entityType === 'profile' ? 'ProfilePage' : 'WebPage',
    '@id': `${page.canonical}#webpage`,
    url: page.canonical,
    name: page.h1,
    description: page.description || undefined,
    isPartOf: config.siteUrl ? { '@id': siteId } : undefined,
    inLanguage: 'tr',
  });
  if (pageNode && record.entityType !== 'home') graph.push(pageNode);

  const crumbs = crumbsToJsonLd(page.breadcrumbs, config);
  if (crumbs) graph.push(crumbs);

  if ((record.entityType === 'blog' || record.entityType === 'post') && page.h1 && page.description) {
    const article = compact({
      '@type': record.entityType === 'blog' ? 'BlogPosting' : 'Article',
      headline: page.h1,
      description: page.description,
      datePublished: record.publishedAt ?? undefined,
      dateModified: record.updatedAt,
      mainEntityOfPage: page.canonical,
      image: record.images[0]?.url,
      author: record.author
        ? compact({
            '@type': 'Person',
            name: record.author.name,
            url: record.author.path ? absoluteUrl(config, record.author.path) : undefined,
          })
        : { '@type': 'Organization', name: config.organizationName, url: config.siteUrl || undefined },
      publisher: { '@type': 'Organization', name: config.organizationName, url: config.siteUrl || undefined },
    });
    if (article && record.publishedAt) graph.push(article);
  }

  if (record.entityType === 'profile' && record.author) {
    const person = compact({
      '@type': 'Person',
      name: record.author.name,
      url: page.canonical,
      description: page.description || undefined,
      image: record.images[0]?.url,
      homeLocation: record.city ? { '@type': 'Place', name: record.city.name } : undefined,
    });
    if (person) graph.push(person);
  }

  if (record.city && (record.entityType === 'city' || record.entityType === 'city_intent')) {
    const place = compact({
      '@type': 'Place',
      name: record.city.name,
      url: absoluteUrl(config, record.city.path),
      address: {
        '@type': 'PostalAddress',
        addressLocality: record.city.name,
        addressRegion: record.city.region,
        addressCountry: record.city.country,
      },
    });
    if (place) graph.push(place);
  }

  if (record.entityType === 'event' && record.event && record.publishedAt) {
    const eventNode = compact({
      '@type': 'Event',
      name: record.event.name,
      description: page.description || undefined,
      startDate: record.event.start,
      endDate: record.event.end ?? undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: record.images[0]?.url,
      url: page.canonical,
      location: record.event.location
        ? {
            '@type': 'Place',
            name: record.event.location,
            address: record.city
              ? {
                  '@type': 'PostalAddress',
                  addressLocality: record.city.name,
                  addressCountry: 'TR',
                }
              : undefined,
          }
        : undefined,
      organizer: record.event.organizer
        ? { '@type': 'Person', name: record.event.organizer }
        : { '@type': 'Organization', name: config.organizationName },
    });
    if (eventNode && record.event.location) graph.push(eventNode);
  }

  if (record.video && record.video.name && record.video.thumbnailUrl && record.video.uploadDate && record.video.contentUrl) {
    const video = compact({
      '@type': 'VideoObject',
      name: record.video.name,
      description: record.video.description,
      thumbnailUrl: record.video.thumbnailUrl,
      uploadDate: record.video.uploadDate,
      contentUrl: record.video.contentUrl,
      duration: record.video.durationSeconds ? `PT${Math.round(record.video.durationSeconds)}S` : undefined,
    });
    if (video && record.video.description) graph.push(video);
  }

  const visibleFaqs = record.faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
  if (visibleFaqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: visibleFaqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  const types = graph.map((node) => String(node['@type']));
  if (graph.length === 0) return { blocks: [], types: [] };
  return {
    blocks: [
      {
        '@context': 'https://schema.org',
        '@graph': graph,
      },
    ],
    types,
  };
}
