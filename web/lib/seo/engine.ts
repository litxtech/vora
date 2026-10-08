import type { Metadata } from 'next';
import { absoluteUrl, canonicalPath, isIndexableDeployment, siteUrl, SITE_NAME } from '@/lib/site';

export type BreadcrumbItem = { name: string; path: string };

export type SeoDocument = {
  title: string;
  description: string;
  path: string;
  index: boolean;
  follow?: boolean;
  type: 'website' | 'article' | 'profile';
  image?: string | null;
  language?: string;
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: Record<string, unknown>[];
  publishedAt?: string | null;
  modifiedAt?: string | null;
  alternates?: { hrefLang: string; path: string }[];
};

export function toMetadata(doc: SeoDocument): Metadata {
  const index = doc.index && isIndexableDeployment();
  const follow = doc.follow !== false;
  const canonical = absoluteUrl(canonicalPath(doc.path));
  const title = /vora/i.test(doc.title) ? doc.title : `${doc.title} · Vora`;
  const languages: Record<string, string> = {};
  for (const alt of doc.alternates ?? []) {
    languages[alt.hrefLang] = absoluteUrl(alt.path);
  }
  if (doc.language === 'tr' || !doc.language) {
    languages.tr = canonical;
  }
  return {
    title: { absolute: title },
    description: doc.description,
    alternates: {
      canonical,
      languages: Object.keys(languages).length > 1 ? languages : { tr: canonical },
    },
    robots: { index, follow, googleBot: { index, follow } },
    openGraph: {
      title: doc.title,
      description: doc.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: doc.language === 'en' ? 'en_US' : doc.language === 'de' ? 'de_DE' : doc.language === 'es' ? 'es_ES' : 'tr_TR',
      type: doc.type === 'article' ? 'article' : 'website',
      images: doc.image ? [{ url: doc.image }] : [{ url: absoluteUrl('/vora-logo.png') }],
    },
    twitter: {
      card: doc.image ? 'summary_large_image' : 'summary',
      title: doc.title,
      description: doc.description,
      images: doc.image ? [doc.image] : undefined,
    },
  };
}

export function breadcrumbLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationLd(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'LitxTech',
    url: siteUrl(),
    logo: absoluteUrl('/vora-logo.png'),
    email: 'support@litxtech.com',
  };
}

export function websiteLd(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl(),
    inLanguage: 'tr',
    publisher: { '@type': 'Organization', name: SITE_NAME, url: siteUrl() },
  };
}

export function softwareLd(): Record<string, unknown> {
  return {
    '@type': 'SoftwareApplication',
    name: 'Vora',
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'iOS, Android',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
    installUrl: absoluteUrl('/download'),
  };
}

export function graph(nodes: Record<string, unknown>[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  };
}

export function trimDescription(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
