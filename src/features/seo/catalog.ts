import { GUIDE_INTENT, SEO_LIMITS, STATIC_PAGES } from '@/features/seo/constants';
import { relatedLinks } from '@/features/seo/internalLinks';
import { scoreContentQuality } from '@/features/seo/quality';
import {
  containsSensitiveContact,
  contentPath,
  excerpt,
  hashtagsIn,
  normalizeForCompare,
  slugify,
} from '@/features/seo/text';
import type {
  PublicEventSource,
  PublicGuideSource,
  PublicPostSource,
  PublicProfileSource,
  PublicRegionSource,
  PublicSeoSource,
  SeoLink,
  SeoRecord,
} from '@/features/seo/types';

type CityRef = { name: string; slug: string; path: string; country: string; region: string };

function cityOf(regions: Map<string, PublicRegionSource>, regionId: string | null): CityRef | null {
  if (!regionId) return null;
  const region = regions.get(regionId);
  if (!region?.active) return null;
  return {
    name: region.name,
    slug: region.id,
    path: `/sehirler/${region.id}`,
    country: 'TR',
    region: 'Karadeniz',
  };
}

function authorPublic(author: PublicPostSource['author'] | PublicProfileSource | null): boolean {
  if (!author) return false;
  return (
    author.profileVisibility === 'public' &&
    author.accountStatus === 'active' &&
    !author.isGuest &&
    !author.quarantined
  );
}

function displayName(fullName: string | null, username: string): string {
  const name = fullName?.trim();
  return name || username;
}

function overrideFor(source: PublicSeoSource, entityType: string, id: string) {
  return source.overrides.find((row) => row.entityType === entityType && row.entityId === id) ?? null;
}

function withQuality(record: SeoRecord): SeoRecord {
  const quality = scoreContentQuality(record);
  return {
    ...record,
    hints: {
      ...record.hints,
      spam: record.hints.spam || quality.spam,
      meaningful: record.hints.meaningful && quality.meaningful && !quality.spam,
    },
  };
}

function imageAlt(label: string): string {
  return label.trim().slice(0, 120);
}

export function assembleCatalog(source: PublicSeoSource, now = new Date()): SeoRecord[] {
  const regions = new Map(source.regions.filter((region) => region.active).map((region) => [region.id, region]));
  const seenBodies = new Map<string, string>();
  const posts: SeoRecord[] = [];

  for (const post of source.posts) {
    if (post.audience !== 'public' || post.status !== 'published') continue;
    if (!authorPublic(post.author) || !post.author) continue;
    const city = cityOf(regions, post.regionId);
    const text = [post.title, post.content].filter(Boolean).join('\n\n');
    const normalized = normalizeForCompare(post.content);
    const duplicateOfPath = normalized ? seenBodies.get(normalized) ?? null : null;
    const label = post.title?.trim() || excerpt(post.content, 48);
    const path = contentPath('/p', label, post.id, 'gonderi');
    if (normalized && !duplicateOfPath) seenBodies.set(normalized, path);
    const sensitive = containsSensitiveContact(text);
    const record: SeoRecord = {
      entityType: 'post',
      id: post.id,
      path,
      h1: post.title?.trim() || excerpt(post.content, 72),
      paragraphs: [post.content.trim()].filter(Boolean),
      sections: [],
      updatedAt: post.updatedAt || post.createdAt,
      publishedAt: post.createdAt,
      images: post.mediaUrls
        .filter((url) => url.startsWith('https://') && !/\.(mp4|mov|m3u8|webm)(\?|$)/i.test(url))
        .slice(0, 4)
        .map((url) => ({
          url,
          alt: imageAlt(city ? `${city.name} Vora paylaşımı` : 'Vora public paylaşım görseli'),
        })),
      video: null,
      author: {
        name: displayName(post.author.fullName, post.author.username),
        username: post.author.username,
        path: null,
      },
      city,
      event: null,
      faqs: [],
      links: [],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        ...(city ? [{ name: city.name, path: city.path }] : [{ name: 'Keşfet', path: '/kesfet' }]),
        { name: post.title?.trim() || 'Paylaşım', path },
      ],
      hints: {
        visibility: 'public',
        moderation: 'approved',
        authorPublic: true,
        searchEnginesAllowed: false,
        sensitive,
        spam: false,
        deleted: false,
        duplicateOfPath,
        meaningful: !sensitive && Boolean(city),
      },
      override: overrideFor(source, 'post', post.id),
      searchIntent: 'community',
      locale: 'tr',
      alternates: [],
    };
    posts.push(withQuality(record));
  }

  const indexablePostAuthors = new Set(
    posts.filter((post) => post.hints.meaningful && !post.hints.spam).map((post) => post.author?.username).filter(Boolean),
  );

  const profiles: SeoRecord[] = source.profiles.filter(authorPublic).map((profile) => {
    const city = cityOf(regions, profile.regionId);
    const name = displayName(profile.fullName, profile.username);
    const path = `/u/${profile.username.toLocaleLowerCase('tr')}`;
    const interestLine = profile.interests.length > 0 ? `İlgi alanları: ${profile.interests.slice(0, 8).join(', ')}.` : '';
    const paragraphs = [
      profile.bio?.trim() || '',
      city ? `${name}, ${city.name} ile ilişkili bir Vora profili.` : `${name} adlı Vora kullanıcısının public profili.`,
      interestLine,
      profile.isVerified ? 'Bu hesap doğrulanmış olarak işaretli.' : '',
    ].filter(Boolean);
    const record: SeoRecord = {
      entityType: 'profile',
      id: profile.id,
      path,
      h1: name,
      paragraphs,
      sections: [],
      updatedAt: profile.updatedAt,
      publishedAt: null,
      images: profile.avatarUrl?.startsWith('https://')
        ? [{ url: profile.avatarUrl, alt: imageAlt(`${name} profil fotoğrafı`) }]
        : [],
      video: null,
      author: { name, username: profile.username, path },
      city,
      event: null,
      faqs: [],
      links: city ? [{ href: city.path, text: `${city.name} sosyal topluluğu` }] : [],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Şehirler', path: '/sehirler' },
        { name, path },
      ],
      hints: {
        visibility: 'public',
        moderation: 'approved',
        authorPublic: true,
        searchEnginesAllowed: profile.webSearchVisible,
        sensitive: containsSensitiveContact(paragraphs.join('\n')),
        spam: false,
        deleted: false,
        duplicateOfPath: null,
        meaningful: Boolean(profile.bio && profile.bio.trim().length >= SEO_LIMITS.profileMinBioChars) || indexablePostAuthors.has(profile.username),
      },
      override: overrideFor(source, 'profile', profile.id),
      searchIntent: 'navigational',
      locale: 'tr',
      alternates: [],
    };
    return withQuality(record);
  });

  const profilePath = new Map(profiles.map((profile) => [profile.author?.username, profile.path]));
  for (const post of posts) {
    const username = post.author?.username;
    if (!username) continue;
    const path = profilePath.get(username);
    const profile = profiles.find((item) => item.path === path);
    if (path && profile?.hints.searchEnginesAllowed && profile.hints.meaningful) {
      post.author = { ...post.author!, path };
      post.links.push({ href: path, text: post.author.name });
    }
  }

  const events: SeoRecord[] = [];
  for (const event of source.events) {
    if (event.status !== 'published') continue;
    const city = cityOf(regions, event.regionId);
    const path = contentPath('/etkinlik', event.title, event.id, 'etkinlik');
    const past = Date.parse(event.startsAt) < now.getTime();
    const record: SeoRecord = {
      entityType: 'event',
      id: event.id,
      path,
      h1: event.title.trim(),
      paragraphs: [event.description.trim(), event.locationName ? `Yer: ${event.locationName}.` : ''].filter(Boolean),
      sections: [],
      updatedAt: event.updatedAt || event.createdAt,
      publishedAt: event.createdAt,
      images: event.coverUrl?.startsWith('https://')
        ? [{ url: event.coverUrl, alt: imageAlt(`${event.title} etkinlik görseli`) }]
        : [],
      video: null,
      author: event.organizerPublic && event.organizerName
        ? { name: event.organizerName, username: event.organizerUsername, path: null }
        : null,
      city,
      event: {
        name: event.title.trim(),
        start: event.startsAt,
        end: event.endsAt,
        location: event.locationName,
        organizer: event.organizerPublic ? event.organizerName : null,
        past,
      },
      faqs: [],
      links: city ? [{ href: city.path, text: `${city.name} sosyal topluluğu` }] : [],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Etkinlikler', path: '/etkinlikler' },
        ...(city ? [{ name: city.name, path: city.path }] : []),
        { name: event.title.trim(), path },
      ],
      hints: {
        visibility: 'public',
        moderation: 'approved',
        authorPublic: true,
        searchEnginesAllowed: false,
        sensitive: containsSensitiveContact(event.description),
        spam: false,
        deleted: false,
        duplicateOfPath: null,
        meaningful: event.title.trim().length > 3 && event.description.trim().length >= 40 && Boolean(city),
      },
      override: overrideFor(source, 'event', event.id),
      searchIntent: 'local',
      locale: 'tr',
      alternates: [],
    };
    events.push(withQuality(record));
  }

  const guides: SeoRecord[] = source.guides.map((guide) => guideRecord(guide, regions, source));
  const topics = topicRecords(posts, source);
  const cities = cityRecords(regions, posts, events, profiles, guides);
  const hubs = hubRecords(posts, events, guides, profiles, cities);
  const staticPages = staticRecords(source);
  const home = homeRecord(posts, events, guides, cities, profiles);

  const records = [...staticPages, home, ...hubs, ...cities, ...guides, ...topics, ...events, ...profiles, ...posts];
  return connect(records);
}

function guideRecord(guide: PublicGuideSource, regions: Map<string, PublicRegionSource>, source: PublicSeoSource): SeoRecord {
  const faqs = guide.sections
    .filter((section) => section.heading.trim().endsWith('?') && section.body.trim().length >= 20)
    .map((section) => ({ question: section.heading.trim(), answer: section.body.trim() }));
  const mentioned = [...regions.values()].find((region) =>
    `${guide.title} ${guide.summary}`.toLocaleLowerCase('tr').includes(region.name.toLocaleLowerCase('tr')),
  );
  const city = mentioned
    ? { name: mentioned.name, slug: mentioned.id, path: `/sehirler/${mentioned.id}`, country: 'TR', region: 'Karadeniz' }
    : null;
  const path = `/blog/${slugify(guide.slug, 'yazi')}`;
  const record: SeoRecord = {
    entityType: 'blog',
    id: guide.id,
    path,
    h1: guide.title.trim(),
    paragraphs: [guide.summary.trim(), guide.footerNote?.trim() || ''].filter(Boolean),
    sections: guide.sections.map((section) => ({
      heading: section.heading.trim(),
      paragraphs: [section.body.trim()].filter(Boolean),
    })),
    updatedAt: guide.updatedAt,
    publishedAt: guide.publishedAt ?? guide.updatedAt,
    images: guide.imageUrl?.startsWith('https://')
      ? [{ url: guide.imageUrl, alt: imageAlt(`${guide.title} kapak görseli`) }]
      : [],
    video:
      guide.videoUrl?.startsWith('https://') && guide.imageUrl?.startsWith('https://')
        ? {
            name: guide.title.trim(),
            description: guide.summary.trim(),
            thumbnailUrl: guide.imageUrl,
            uploadDate: guide.publishedAt ?? guide.updatedAt,
            contentUrl: guide.videoUrl,
            durationSeconds: null,
          }
        : null,
    author: null,
    city,
    event: null,
    faqs,
    links: [],
    breadcrumbs: [
      { name: 'Vora', path: '/' },
      { name: 'Blog', path: '/blog' },
      ...(city ? [{ name: city.name, path: city.path }] : []),
      { name: guide.title.trim(), path },
    ],
    hints: {
      visibility: 'public',
      moderation: 'approved',
      authorPublic: true,
      searchEnginesAllowed: false,
      sensitive: false,
      spam: false,
      deleted: false,
      duplicateOfPath: null,
      meaningful: guide.summary.trim().length + guide.sections.map((section) => section.body).join(' ').length >= 80,
    },
    override: overrideFor(source, 'blog', guide.id),
    searchIntent: GUIDE_INTENT[guide.category] ?? 'guide',
    locale: 'tr',
    alternates: [],
  };
  return withQuality(record);
}

function topicRecords(posts: SeoRecord[], source: PublicSeoSource): SeoRecord[] {
  const buckets = new Map<string, { authors: Set<string>; posts: SeoRecord[] }>();
  for (const post of posts) {
    if (!post.hints.meaningful || post.hints.spam || post.hints.sensitive) continue;
    for (const tag of hashtagsIn(post.paragraphs.join('\n'))) {
      const bucket = buckets.get(tag) ?? { authors: new Set<string>(), posts: [] };
      if (post.author?.username) bucket.authors.add(post.author.username);
      bucket.posts.push(post);
      buckets.set(tag, bucket);
    }
  }
  const records: SeoRecord[] = [];
  for (const [tag, bucket] of buckets) {
    if (bucket.posts.length < SEO_LIMITS.topicMinPosts || bucket.authors.size < SEO_LIMITS.topicMinAuthors) continue;
    const path = `/konu/${tag}`;
    const excerpts = bucket.posts.slice(0, 3).map((post) => excerpt(post.paragraphs[0] ?? '', 120));
    const record: SeoRecord = {
      entityType: 'topic',
      id: tag,
      path,
      h1: `#${tag}`,
      paragraphs: [
        `${tag} etiketiyle işaretlenmiş ${bucket.posts.length} farklı public paylaşım var. Bu sayfa yalnızca çeşitlilik eşiğini geçen etiketler için açılır.`,
        ...excerpts,
      ],
      sections: [],
      updatedAt: bucket.posts[0]?.updatedAt ?? new Date(0).toISOString(),
      publishedAt: bucket.posts[0]?.publishedAt ?? null,
      images: [],
      video: null,
      author: null,
      city: null,
      event: null,
      faqs: [],
      links: bucket.posts.slice(0, 8).map((post) => ({ href: post.path, text: post.h1 })),
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Konular', path: '/kesfet' },
        { name: `#${tag}`, path },
      ],
      hints: {
        visibility: 'public',
        moderation: 'approved',
        authorPublic: true,
        searchEnginesAllowed: false,
        sensitive: false,
        spam: false,
        deleted: false,
        duplicateOfPath: null,
        meaningful: true,
      },
      override: overrideFor(source, 'topic', tag),
      searchIntent: 'community',
      locale: 'tr',
      alternates: [],
    };
    records.push(withQuality(record));
  }
  return records;
}

function cityRecords(
  regions: Map<string, PublicRegionSource>,
  posts: SeoRecord[],
  events: SeoRecord[],
  profiles: SeoRecord[],
  guides: SeoRecord[],
): SeoRecord[] {
  const records: SeoRecord[] = [];
  for (const region of regions.values()) {
    const city: CityRef = {
      name: region.name,
      slug: region.id,
      path: `/sehirler/${region.id}`,
      country: 'TR',
      region: 'Karadeniz',
    };
    const cityPosts = posts.filter((post) => post.city?.slug === region.id && post.hints.meaningful && !post.hints.duplicateOfPath);
    const cityEvents = events.filter((event) => event.city?.slug === region.id && event.hints.meaningful);
    const cityPeople = profiles.filter(
      (profile) => profile.city?.slug === region.id && profile.hints.searchEnginesAllowed && profile.hints.meaningful,
    );
    const cityGuides = guides.filter((guide) => guide.city?.slug === region.id && guide.hints.meaningful);
    const meaningful = cityPosts.length > 0 || cityEvents.length > 0 || cityPeople.length >= SEO_LIMITS.cityPeopleMin;
    const paragraphs = [
      `${region.name} sosyal topluluğunda ${cityPosts.length} kaliteli public paylaşım ve ${cityEvents.length} public etkinlik görünüyor.`,
      cityPosts[0] ? `${region.name} içinden bir public paylaşım: “${excerpt(cityPosts[0].paragraphs[0] ?? '', 160)}”.` : '',
      cityEvents[0] ? `${region.name} etkinliklerinden biri: ${cityEvents[0].h1}.` : '',
      cityPeople.length > 0 ? `${region.name} için aramada görünmeyi seçmiş public profiller bu sayfadan ulaşılır.` : '',
      !meaningful ? `${region.name} Vora’da kayıtlı bir şehir. Henüz dizine eklenecek kadar public içerik birikmedi.` : '',
    ].filter(Boolean);
    const links: SeoLink[] = [
      ...cityPosts.map((post) => ({ href: post.path, text: post.h1 })),
      ...cityEvents.map((event) => ({ href: event.path, text: event.h1 })),
      ...cityPeople.map((profile) => ({ href: profile.path, text: profile.h1 })),
      ...cityGuides.slice(0, 3).map((guide) => ({ href: guide.path, text: guide.h1 })),
    ];
    records.push(
      withQuality({
        entityType: 'city',
        id: region.id,
        path: city.path,
        h1: `${region.name} sosyal topluluğu`,
        paragraphs,
        sections: [],
        updatedAt: cityPosts[0]?.updatedAt ?? cityEvents[0]?.updatedAt ?? new Date(0).toISOString(),
        publishedAt: null,
        images: cityPosts[0]?.images.slice(0, 1) ?? [],
        video: null,
        author: null,
        city,
        event: null,
        faqs: [],
        links,
        breadcrumbs: [
          { name: 'Vora', path: '/' },
          { name: 'Şehirler', path: '/sehirler' },
          { name: region.name, path: city.path },
        ],
        hints: {
          visibility: 'public',
          moderation: 'approved',
          authorPublic: true,
          searchEnginesAllowed: false,
          sensitive: false,
          spam: false,
          deleted: false,
          duplicateOfPath: null,
          meaningful,
        },
        override: null,
        searchIntent: 'local',
        locale: 'tr',
        alternates: [],
      }),
    );

    pushIntent(records, city, 'etkinlikler', `${region.name} etkinlikleri`, cityEvents, SEO_LIMITS.cityEventsIntentMin);
    pushIntent(records, city, 'paylasimlar', `${region.name} public paylaşımları`, cityPosts, SEO_LIMITS.cityPostsIntentMin);
    pushIntent(records, city, 'insanlar', `${region.name} public profilleri`, cityPeople, SEO_LIMITS.cityPeopleMin);
  }
  return records;
}

function pushIntent(records: SeoRecord[], city: CityRef, suffix: string, h1: string, items: SeoRecord[], minimum: number): void {
  if (items.length < minimum) return;
  const path = `${city.path}/${suffix}`;
  records.push(
    withQuality({
      entityType: 'city_intent',
      id: `${city.slug}-${suffix}`,
      path,
      h1,
      paragraphs: [
        `${h1} sayfası, ${city.name} için uygulamada gerçekten yayınlanmış ${items.length} public kayıttan oluşur.`,
        excerpt(items[0]?.paragraphs[0] ?? items[0]?.h1 ?? '', 160),
      ].filter(Boolean),
      sections: [],
      updatedAt: items[0]?.updatedAt ?? new Date(0).toISOString(),
      publishedAt: null,
      images: [],
      video: null,
      author: null,
      city,
      event: null,
      faqs: [],
      links: items.slice(0, 12).map((item) => ({ href: item.path, text: item.h1 })),
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Şehirler', path: '/sehirler' },
        { name: city.name, path: city.path },
        { name: h1, path },
      ],
      hints: {
        visibility: 'public',
        moderation: 'approved',
        authorPublic: true,
        searchEnginesAllowed: false,
        sensitive: false,
        spam: false,
        deleted: false,
        duplicateOfPath: null,
        meaningful: true,
      },
      override: null,
      searchIntent: 'local',
      locale: 'tr',
      alternates: [],
    }),
  );
}

function hubRecords(
  posts: SeoRecord[],
  events: SeoRecord[],
  guides: SeoRecord[],
  profiles: SeoRecord[],
  cities: SeoRecord[],
): SeoRecord[] {
  const meaningfulPosts = posts.filter((post) => post.hints.meaningful && !post.hints.duplicateOfPath);
  const meaningfulEvents = events.filter((event) => event.hints.meaningful);
  const meaningfulGuides = guides.filter((guide) => guide.hints.meaningful);
  const meaningfulCities = cities.filter((city) => city.entityType === 'city' && city.hints.meaningful);
  const visibleProfiles = profiles.filter((profile) => profile.hints.searchEnginesAllowed && profile.hints.meaningful);

  const explore: SeoRecord = {
    entityType: 'static',
    id: 'explore',
    path: '/kesfet',
    h1: 'Public paylaşımlar',
    paragraphs: [
      meaningfulPosts.length > 0
        ? `Keşfet, kalite eşiğini geçen ${meaningfulPosts.length} public paylaşımı listeler. Arama sonuçları ve filtreler dizine eklenmez.`
        : 'Henüz dizine eklenecek kalitede public paylaşım yok.',
    ],
    sections: [],
    updatedAt: meaningfulPosts[0]?.updatedAt ?? new Date(0).toISOString(),
    publishedAt: null,
    images: [],
    video: null,
    author: null,
    city: null,
    event: null,
    faqs: [],
    links: meaningfulPosts.slice(0, SEO_LIMITS.explorePageSize).map((post) => ({ href: post.path, text: post.h1 })),
    breadcrumbs: [
      { name: 'Vora', path: '/' },
      { name: 'Keşfet', path: '/kesfet' },
    ],
    hints: baseHints(meaningfulPosts.length > 0),
    override: null,
    searchIntent: 'community',
    locale: 'tr',
    alternates: [],
  };

  return [
    withQuality(explore),
    withQuality({
      ...explore,
      id: 'events-index',
      path: '/etkinlikler',
      h1: 'Karadeniz etkinlikleri',
      paragraphs: [
        meaningfulEvents.length > 0
          ? `Yaklaşan ve yayınlanmış ${meaningfulEvents.length} public etkinlik. Geçmiş etkinlikler tarihleriyle birlikte durur.`
          : 'Yayınlanmış public etkinlik bulunmuyor.',
      ],
      links: meaningfulEvents.slice(0, 20).map((event) => ({ href: event.path, text: event.h1 })),
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Etkinlikler', path: '/etkinlikler' },
      ],
      hints: baseHints(meaningfulEvents.length > 0),
      updatedAt: meaningfulEvents[0]?.updatedAt ?? explore.updatedAt,
    }),
    withQuality({
      ...explore,
      id: 'blog-index',
      path: '/blog',
      h1: 'Vora blog',
      paragraphs: [
        meaningfulGuides.length > 0
          ? `Platform rehberinden yayınlanmış ${meaningfulGuides.length} yazı.`
          : 'Yayınlanmış blog yazısı yok.',
      ],
      links: meaningfulGuides.map((guide) => ({ href: guide.path, text: guide.h1 })),
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Blog', path: '/blog' },
      ],
      hints: baseHints(meaningfulGuides.length > 0),
      updatedAt: meaningfulGuides[0]?.updatedAt ?? explore.updatedAt,
    }),
    withQuality({
      ...explore,
      id: 'cities-index',
      path: '/sehirler',
      h1: 'Karadeniz şehirleri',
      paragraphs: [
        meaningfulCities.length > 0
          ? `İçeriği olan ${meaningfulCities.length} şehir sayfası. Boş şehir ve kelime kombinasyonları üretilmez.`
          : 'Henüz public içeriği birikmiş şehir sayfası yok.',
      ],
      links: [
        ...meaningfulCities.map((city) => ({ href: city.path, text: city.h1 })),
        ...visibleProfiles.slice(0, 24).map((profile) => ({ href: profile.path, text: profile.h1 })),
      ],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Şehirler', path: '/sehirler' },
      ],
      hints: baseHints(meaningfulCities.length > 0),
      updatedAt: meaningfulCities[0]?.updatedAt ?? explore.updatedAt,
    }),
    withQuality({
      ...explore,
      id: 'search',
      path: '/ara',
      h1: 'Sitede ara',
      paragraphs: ['Site içi arama sonuçları dizine eklenmez. Herkese açık sayfalar arasında arama yapılır.'],
      links: [],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: 'Ara', path: '/ara' },
      ],
      hints: { ...baseHints(true), meaningful: true },
      searchIntent: 'navigational',
    }),
  ];
}

function staticRecords(source: PublicSeoSource): SeoRecord[] {
  return STATIC_PAGES.map((page) =>
    withQuality({
      entityType: 'static',
      id: page.id,
      path: page.path,
      h1: page.h1,
      paragraphs: page.paragraphs,
      sections: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
      publishedAt: '2026-01-01T00:00:00.000Z',
      images: [],
      video: null,
      author: null,
      city: null,
      event: null,
      faqs: [],
      links: [
        { href: '/sehirler', text: 'Şehirler' },
        { href: '/kesfet', text: 'Keşfet' },
        { href: '/blog', text: 'Blog' },
        { href: '/etkinlikler', text: 'Etkinlikler' },
        { href: '/indir', text: 'Vora’yı indir' },
      ],
      breadcrumbs: [
        { name: 'Vora', path: '/' },
        { name: page.h1, path: page.path },
      ],
      hints: baseHints(true),
      override: overrideFor(source, 'static', page.id),
      searchIntent: page.id === 'download' ? 'navigational' : 'informational',
      locale: 'tr',
      alternates: [],
    }),
  );
}

function homeRecord(
  posts: SeoRecord[],
  events: SeoRecord[],
  guides: SeoRecord[],
  cities: SeoRecord[],
  profiles: SeoRecord[],
): SeoRecord {
  const featuredPosts = posts.filter((post) => post.hints.meaningful && !post.hints.duplicateOfPath).slice(0, 6);
  const featuredCities = cities.filter((city) => city.entityType === 'city' && city.hints.meaningful).slice(0, 6);
  const featuredEvents = events.filter((event) => event.hints.meaningful && event.event && !event.event.past).slice(0, 4);
  const featuredGuides = guides.filter((guide) => guide.hints.meaningful).slice(0, 4);
  const latest = [featuredPosts[0]?.updatedAt, featuredEvents[0]?.updatedAt, featuredGuides[0]?.updatedAt]
    .filter(Boolean)
    .sort()
    .at(-1);
  return withQuality({
    entityType: 'home',
    id: 'home',
    path: '/',
    h1: 'Vora | Karadeniz sosyal uygulaması',
    paragraphs: [
      'Vora, Karadeniz şehirlerindeki insanların public paylaşımlarını, etkinliklerini ve topluluklarını bir araya getirir.',
      featuredPosts.length > 0
        ? `Şu an ${featuredPosts.length} öne çıkan public paylaşım ana sayfadan ulaşılabiliyor.`
        : 'Public paylaşımlar kalite eşiğini geçtiğinde burada listelenir.',
      'Özel mesajlar, cüzdan, ayarlar ve kapalı profiller bu sitede yoktur.',
    ],
    sections: [],
    updatedAt: latest ?? '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
    images: [],
    video: null,
    author: null,
    city: null,
    event: null,
    faqs: [],
    links: [
      ...featuredCities.map((city) => ({ href: city.path, text: city.h1 })),
      ...featuredGuides.map((guide) => ({ href: guide.path, text: guide.h1 })),
      ...featuredEvents.map((event) => ({ href: event.path, text: event.h1 })),
      ...featuredPosts.map((post) => ({ href: post.path, text: post.h1 })),
      ...profiles
        .filter((profile) => profile.hints.searchEnginesAllowed && profile.hints.meaningful)
        .slice(0, 4)
        .map((profile) => ({ href: profile.path, text: profile.h1 })),
      { href: '/indir', text: 'Vora’yı indir' },
    ],
    breadcrumbs: [{ name: 'Vora', path: '/' }],
    hints: baseHints(true),
    override: null,
    searchIntent: 'navigational',
    locale: 'tr',
    alternates: [],
  });
}

function baseHints(meaningful: boolean): SeoRecord['hints'] {
  return {
    visibility: 'public',
    moderation: 'approved',
    authorPublic: true,
    searchEnginesAllowed: false,
    sensitive: false,
    spam: false,
    deleted: false,
    duplicateOfPath: null,
    meaningful,
  };
}

function connect(records: SeoRecord[]): SeoRecord[] {
  const used = new Map<string, number>();
  return records.map((record) => {
    const extra = relatedLinks(record, records, used);
    const links: SeoLink[] = [];
    for (const link of [...record.links, ...extra]) {
      if (!link.href.startsWith('/') || link.href === record.path) continue;
      if (links.some((item) => item.href === link.href)) continue;
      links.push(link);
    }
    return { ...record, links };
  });
}

export function findByPath(records: SeoRecord[], path: string): SeoRecord | null {
  return records.find((record) => record.path === path) ?? null;
}

export function searchRecords(records: SeoRecord[], query: string): SeoRecord[] {
  const needle = query.trim().toLocaleLowerCase('tr');
  if (needle.length < 2) return [];
  return records
    .filter((record) => record.path !== '/ara' && record.hints.visibility === 'public' && record.hints.moderation === 'approved')
    .filter((record) => `${record.h1} ${record.paragraphs.join(' ')}`.toLocaleLowerCase('tr').includes(needle))
    .slice(0, 20);
}
