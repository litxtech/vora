export type SeoLocale = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ar';

export type SeoEntityType =
  | 'home'
  | 'static'
  | 'city'
  | 'city_intent'
  | 'post'
  | 'profile'
  | 'event'
  | 'blog'
  | 'topic';

export type SeoModeration = 'approved' | 'pending' | 'rejected' | 'hidden' | 'deleted' | 'draft';

export type SeoVisibility = 'public' | 'members' | 'friends' | 'close_friends' | 'private';

export type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'commercial'
  | 'local'
  | 'community'
  | 'how_to'
  | 'guide'
  | 'news';

export type SiteConfig = {
  siteName: string;
  siteUrl: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage: string | null;
  twitterHandle: string | null;
  organizationName: string;
  organizationLogo: string | null;
  defaultLocale: SeoLocale;
  supportedLocales: SeoLocale[];
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  sameAs: string[];
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
};

export type SeoImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type SeoVideo = {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  durationSeconds: number | null;
};

export type SeoLink = {
  href: string;
  text: string;
};

export type SeoOverride = {
  entityType: string;
  entityId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonical: string | null;
  seoNoindex: boolean | null;
  ogImageUrl: string | null;
  searchIntent: SearchIntent | null;
};

export type SeoRedirect = {
  oldPath: string;
  newPath: string;
  redirectType: 301 | 302;
};

export type IndexHints = {
  visibility: SeoVisibility;
  moderation: SeoModeration;
  authorPublic: boolean;
  searchEnginesAllowed: boolean;
  sensitive: boolean;
  spam: boolean;
  deleted: boolean;
  duplicateOfPath: string | null;
  meaningful: boolean;
};

export type SeoRecord = {
  entityType: SeoEntityType;
  id: string;
  path: string;
  h1: string;
  paragraphs: string[];
  sections: { heading: string; paragraphs: string[] }[];
  updatedAt: string;
  publishedAt: string | null;
  images: SeoImage[];
  video: SeoVideo | null;
  author: { name: string; username: string | null; path: string | null } | null;
  city: { name: string; slug: string; path: string; country: string; region: string } | null;
  event: {
    name: string;
    start: string;
    end: string | null;
    location: string | null;
    organizer: string | null;
    past: boolean;
  } | null;
  faqs: { question: string; answer: string }[];
  links: SeoLink[];
  breadcrumbs: { name: string; path: string }[];
  hints: IndexHints;
  override: SeoOverride | null;
  searchIntent: SearchIntent | null;
  locale: SeoLocale;
  alternates: { locale: SeoLocale; path: string }[];
};

export type IndexDecision = {
  indexable: boolean;
  inSitemap: boolean;
  robots: string;
  follow: boolean;
  status: 200 | 404 | 410;
  reasons: string[];
  canonicalPath: string;
};

export type SeoScore = {
  total: number;
  technical: number;
  content: number;
  indexability: number;
  internalLinks: number;
  metadata: number;
  structuredData: number;
  quality: number;
};

export type SeoPage = {
  entityType: SeoEntityType;
  entityId: string;
  path: string;
  absoluteUrl: string;
  status: 200 | 404 | 410 | 503;
  h1: string;
  title: string;
  description: string;
  robots: string;
  canonical: string;
  indexable: boolean;
  inSitemap: boolean;
  reasons: string[];
  paragraphs: string[];
  sections: { heading: string; paragraphs: string[]; links: SeoLink[] }[];
  breadcrumbs: { name: string; path: string }[];
  links: SeoLink[];
  images: SeoImage[];
  video: SeoVideo | null;
  jsonLd: Record<string, unknown>[];
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  hreflang: { hreflang: string; href: string }[];
  score: SeoScore;
  wordCount: number;
  schemaTypes: string[];
  updatedAt: string;
  publishedAt: string | null;
  authorName: string | null;
  cityName: string | null;
};

export type PublicPostSource = {
  id: string;
  title: string | null;
  content: string;
  mediaUrls: string[];
  regionId: string | null;
  audience: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    profileVisibility: string;
    accountStatus: string;
    webSearchVisible: boolean;
    isGuest: boolean;
    quarantined: boolean;
  } | null;
};

export type PublicProfileSource = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  regionId: string | null;
  isVerified: boolean;
  profileVisibility: string;
  accountStatus: string;
  webSearchVisible: boolean;
  isGuest: boolean;
  quarantined: boolean;
  interests: string[];
  updatedAt: string;
};

export type PublicEventSource = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  coverUrl: string | null;
  status: string;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
  organizerName: string | null;
  organizerUsername: string | null;
  organizerPublic: boolean;
};

export type PublicGuideSource = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  sections: { heading: string; body: string }[];
  imageUrl: string | null;
  videoUrl: string | null;
  footerNote: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type PublicRegionSource = {
  id: string;
  name: string;
  active: boolean;
};

export type TombstoneSource = {
  id: string;
  kind: 'post' | 'event';
  status: 'hidden' | 'removed';
  updatedAt: string;
};

export type PublicSeoSource = {
  regions: PublicRegionSource[];
  posts: PublicPostSource[];
  profiles: PublicProfileSource[];
  events: PublicEventSource[];
  guides: PublicGuideSource[];
  tombstones: TombstoneSource[];
  redirects: SeoRedirect[];
  overrides: SeoOverride[];
};

export type AuditIssue = {
  severity: 'critical' | 'warning';
  code: string;
  path: string;
  message: string;
};

export type GraphNode = {
  path: string;
  entityType: SeoEntityType;
  indexable: boolean;
  quality: number;
  seoScore: number;
  inbound: number;
  outbound: number;
  clickDepth: number | null;
  orphan: boolean;
  title: string;
};
