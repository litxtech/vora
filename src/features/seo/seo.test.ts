import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditPages } from '@/features/seo/audit';
import { assembleCatalog } from '@/features/seo/catalog';
import { handleSeoRequest } from '@/features/seo/handleRequest';
import { collapseRedirects } from '@/features/seo/redirect';
import { resolveCatalog } from '@/features/seo/seoEngine';
import { resolveSiteConfig } from '@/features/seo/siteConfig';
import { buildSitemaps } from '@/features/seo/sitemap';
import type { PublicSeoSource } from '@/features/seo/types';

const config = resolveSiteConfig({
  publicSiteUrl: 'https://seo.test',
  iosStoreUrl: 'https://apps.apple.com/app/id1',
  androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.litxtech.vora',
});

const story = 'Trabzon sahilinde bugün hava çok güzel ve insanlar kıyıda yeni tanıdıklarla sohbet ediyor.';

function person(username: string, fullName: string, search: boolean, visibility = 'public') {
  return {
    username,
    fullName,
    avatarUrl: null,
    profileVisibility: visibility,
    accountStatus: 'active',
    webSearchVisible: search,
    isGuest: false,
    quarantined: false,
  };
}

function source(): PublicSeoSource {
  const posts = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Trabzon’da gün batımı',
      content: story,
      mediaUrls: ['https://cdn.example/trabzon-gun-batimi.webp'],
      regionId: 'trabzon',
      audience: 'public',
      status: 'published',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
      author: person('ayse', 'Ayşe Demir', true),
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      title: 'Kısa',
      content: 'kısa',
      mediaUrls: [],
      regionId: 'trabzon',
      audience: 'public',
      status: 'published',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      author: person('ayse', 'Ayşe Demir', true),
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Kopya gün batımı',
      content: story,
      mediaUrls: [],
      regionId: 'trabzon',
      audience: 'public',
      status: 'published',
      createdAt: '2026-04-03T10:00:00.000Z',
      updatedAt: '2026-04-03T10:00:00.000Z',
      author: person('ayse', 'Ayşe Demir', true),
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      title: 'Gizli not',
      content: 'Bu arkadaşlara özel uzun bir not olmalı ve public katalogda hiç görünmemeli.',
      mediaUrls: [],
      regionId: 'trabzon',
      audience: 'friends',
      status: 'published',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      author: person('ayse', 'Ayşe Demir', true),
    },
  ];

  for (let index = 0; index < 8; index += 1) {
    const author = ['ayse', 'mehmet', 'leyla'][index % 3] ?? 'ayse';
    posts.push({
      id: `11111111-1111-1111-1111-11111111111${index}`,
      title: `Karadeniz notu ${index + 1}`,
      content: `${story} #karadeniz etiketiyle ${index + 1}. sıradaki public paylaşım.`,
      mediaUrls: [],
      regionId: 'trabzon',
      audience: 'public',
      status: 'published',
      createdAt: '2026-04-04T10:00:00.000Z',
      updatedAt: '2026-04-04T10:00:00.000Z',
      author: person(author, author, author === 'ayse'),
    });
  }

  return {
    regions: [
      { id: 'trabzon', name: 'Trabzon', active: true },
      { id: 'rize', name: 'Rize', active: true },
    ],
    posts,
    profiles: [
      {
        id: 'p-ayse',
        username: 'ayse',
        fullName: 'Ayşe Demir',
        avatarUrl: 'https://cdn.example/ayse.webp',
        bio: 'Trabzon’da yaşayan, şehir etkinliklerini ve public paylaşımları takip eden bir Vora kullanıcısı.',
        regionId: 'trabzon',
        isVerified: true,
        profileVisibility: 'public',
        accountStatus: 'active',
        webSearchVisible: true,
        isGuest: false,
        quarantined: false,
        interests: ['deniz', 'yürüyüş'],
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'p-mehmet',
        username: 'mehmet',
        fullName: 'Mehmet Kaya',
        avatarUrl: null,
        bio: 'Rize’de kahve ve yayla sohbetlerini seven, profilini arama motorlarından gizleyen kullanıcı.',
        regionId: 'rize',
        isVerified: false,
        profileVisibility: 'public',
        accountStatus: 'active',
        webSearchVisible: false,
        isGuest: false,
        quarantined: false,
        interests: [],
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'p-gizli',
        username: 'gizli',
        fullName: 'Gizli Kişi',
        avatarUrl: null,
        bio: 'Bu biyografi arkadaşlara özeldir ve webde olmamalıdır.',
        regionId: 'trabzon',
        isVerified: false,
        profileVisibility: 'friends',
        accountStatus: 'active',
        webSearchVisible: true,
        isGuest: false,
        quarantined: false,
        interests: [],
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
    ],
    events: [
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        title: 'Trabzon sahil buluşması',
        description: 'Trabzon sahilinde herkese açık bir akşam yürüyüşü ve tanışma buluşması yapılacak.',
        startsAt: '2026-12-01T18:00:00.000Z',
        endsAt: '2026-12-01T20:00:00.000Z',
        locationName: 'Trabzon Sahil',
        coverUrl: 'https://cdn.example/trabzon-etkinlik.webp',
        status: 'published',
        regionId: 'trabzon',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-02T10:00:00.000Z',
        organizerName: 'Ayşe Demir',
        organizerUsername: 'ayse',
        organizerPublic: true,
      },
    ],
    guides: [
      {
        id: 'guide-1',
        slug: 'trabzon-rehberi',
        title: 'Trabzon’da yeni insanlarla tanışmanın yolları',
        summary: 'Trabzon’da Vora üzerinden public etkinlikleri ve şehir topluluğunu takip ederek yeni insanlarla tanışabilirsin.',
        category: 'general',
        sections: [
          { heading: 'Şehir topluluğu', body: 'Trabzon sosyal topluluğu public paylaşımlar ve etkinliklerle büyür.' },
          { heading: 'Vora nedir?', body: 'Vora, Karadeniz şehirleri için kurulmuş bir sosyal uygulamadır.' },
        ],
        imageUrl: 'https://cdn.example/trabzon-rehber.webp',
        videoUrl: null,
        footerNote: null,
        publishedAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
      },
    ],
    tombstones: [
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', kind: 'post', status: 'removed', updatedAt: '2026-05-01T00:00:00.000Z' },
    ],
    redirects: [
      { oldPath: '/blog/eski-yazi', newPath: '/blog/gecici', redirectType: 301 },
      { oldPath: '/blog/gecici', newPath: '/blog/trabzon-rehberi', redirectType: 301 },
    ],
    overrides: [],
  };
}

function deps() {
  return { config, source: source(), now: new Date('2026-06-01T00:00:00.000Z') };
}

async function get(path: string): Promise<{ status: number; headers: Headers; html: string }> {
  const response = await handleSeoRequest(new Request(`https://seo.test${path}`), deps());
  return { status: response.status, headers: response.headers, html: await response.text() };
}

test('ana sayfa ilk HTML içinde başlık, açıklama, canonical ve şema taşır', async () => {
  const response = await get('/');
  assert.equal(response.status, 200);
  assert.match(response.html, /<h1>Vora \| Karadeniz sosyal uygulaması<\/h1>/);
  assert.match(response.html, /name="description"/);
  assert.match(response.html, /rel="canonical" href="https:\/\/seo\.test\/"/);
  assert.match(response.html, /application\/ld\+json/);
  assert.equal((response.html.match(/<h1/g) ?? []).length, 1);
  assert.doesNotMatch(response.html, /aggregateRating|reviewCount/);
  assert.doesNotMatch(response.html, /window\.location/);
  const json = response.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
  assert.ok(json);
  const parsed = JSON.parse(json) as { '@graph': { '@type': string }[] };
  const types = parsed['@graph'].map((node) => node['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('SoftwareApplication'));
});

test('kaliteli public gönderi indexlenir, ince ve gizli içerik indexlenmez', async () => {
  const pages = resolveCatalog(assembleCatalog(source(), new Date('2026-06-01T00:00:00.000Z')), config);
  const good = pages.find((page) => page.h1 === 'Trabzon’da gün batımı');
  const thin = pages.find((page) => page.h1 === 'Kısa');
  assert.ok(good?.indexable);
  assert.equal(good?.inSitemap, true);
  assert.equal(thin?.indexable, false);
  assert.equal(thin?.inSitemap, false);
  const xml = buildSitemaps(pages, config).map((file) => file.xml).join('\n');
  assert.match(xml, new RegExp(good!.path.replaceAll('/', '\\/')));
  assert.doesNotMatch(xml, /kisa/);
  const hidden = await get('/kesfet');
  assert.doesNotMatch(hidden.html, /arkadaşlara özel/);
  assert.doesNotMatch(hidden.html, /Gizli Kişi/);
});

test('profil arama izni yoksa noindex, kapalı profil 404', async () => {
  const open = await get('/u/ayse');
  const closed = await get('/u/mehmet');
  const hidden = await get('/u/gizli');
  assert.equal(open.status, 200);
  assert.match(open.html, /index, follow/);
  assert.match(open.html, /Ayşe Demir/);
  assert.doesNotMatch(open.html, /iban|@vora\.app/);
  assert.equal(closed.status, 200);
  assert.match(closed.html, /noindex/);
  assert.equal(hidden.status, 404);
});

test('silinen içerik 410, eski slug tek adımda 301', async () => {
  const gone = await get('/p/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  assert.equal(gone.status, 410);
  const moved = await get('/blog/eski-yazi');
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('location'), 'https://seo.test/blog/trabzon-rehberi');
  const chain = collapseRedirects(source().redirects);
  assert.equal(chain.loops.length, 0);
  assert.equal(chain.map.get('/blog/eski-yazi')?.newPath, '/blog/trabzon-rehberi');
});

test('izleme parametresi ve arama sonucu normalize edilir', async () => {
  const tracked = await get('/sehirler/trabzon?utm_source=x');
  assert.equal(tracked.status, 301);
  assert.equal(tracked.headers.get('location'), 'https://seo.test/sehirler/trabzon');
  const search = await get('/ara?q=trabzon');
  assert.equal(search.status, 200);
  assert.match(search.html, /noindex/);
  const filtered = await get('/sehirler/trabzon?gender=female');
  assert.match(filtered.html, /noindex/);
});

test('şehir ve etkinlik sayfaları gerçek veriden kurulur, boş şehir indexlenmez', async () => {
  const trabzon = await get('/sehirler/trabzon');
  const rize = await get('/sehirler/rize');
  const event = await get('/etkinlik/trabzon-sahil-bulusmasi-ffffffff');
  assert.equal(trabzon.status, 200);
  assert.match(trabzon.html, /index, follow/);
  assert.match(trabzon.html, /Trabzon sosyal topluluğu/);
  assert.match(rize.html, /noindex/);
  assert.equal(event.status, 200);
  assert.match(event.html, /Event/);
  assert.match(event.html, /2026-12-01/);
  const missingIntent = await get('/sehirler/rize/etkinlikler');
  assert.equal(missingIntent.status, 404);
});

test('blog sorusu görünürse FAQ şeması üretilir ve sitemap noindex çakışması yoktur', async () => {
  const blog = await get('/blog/trabzon-rehberi');
  assert.match(blog.html, /Vora nedir\?/);
  assert.match(blog.html, /FAQPage/);
  const pages = resolveCatalog(assembleCatalog(source(), new Date('2026-06-01T00:00:00.000Z')), config);
  const report = auditPages(pages, source().redirects);
  assert.equal(report.issues.some((issue) => issue.code === 'noindex_sitemap_conflict'), false);
  assert.equal(report.issues.some((issue) => issue.code === 'fake_structured_data'), false);
});

test('robots özel yolları kapatır', async () => {
  const robots = await get('/robots.txt');
  assert.match(robots.html, /Disallow: \/admin/);
  assert.match(robots.html, /Disallow: \/ara/);
  assert.match(robots.html, /Sitemap: https:\/\/seo\.test\/sitemap\.xml/);
  const admin = await get('/admin');
  assert.equal(admin.status, 404);
});
