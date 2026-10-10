import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OfflineTools } from '@/components/offline/offline-tools';
import { Breadcrumbs, CtaBand, JsonLd, ShareBar } from '@/components/site';
import { cityById } from '@/lib/cities';
import { displayName, listBlogByCity, listEvents, listPosts, listProfiles, postHeadline } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { slug: string };

const FACTS = [
  { key: 'history', label: 'Tarih' },
  { key: 'social', label: 'Sosyal yaşam' },
  { key: 'culture', label: 'Kültür' },
  { key: 'local', label: 'Yerel' },
  { key: 'community', label: 'Vora topluluğu' },
] as const;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const city = cityById(slug);
  if (!city) return { title: 'Şehir bulunamadı', robots: { index: false, follow: false } };
  return toMetadata({
    title: `${city.name} — Vora`,
    description: trimDescription(city.description),
    path: `/city/${city.id}`,
    index: true,
    type: 'website',
  });
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const city = cityById(slug);
  if (!city) notFound();
  const [posts, people, events, blogs] = await Promise.all([
    listPosts({ regionId: city.id, limit: 6 }),
    listProfiles(24),
    listEvents({ regionId: city.id, limit: 6 }),
    listBlogByCity(city.id),
  ]);
  const locals = people.filter((person) => person.region_id === city.id).slice(0, 6);
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'Şehirler', path: '/cities' },
    { name: city.name, path: `/city/${city.id}` },
  ];
  const jsonLd = graph([
    breadcrumbLd(crumbs),
    {
      '@type': 'Place',
      name: city.name,
      description: city.description,
      url: absoluteUrl(`/city/${city.id}`),
      containedInPlace: { '@type': 'AdministrativeArea', name: 'Karadeniz, Türkiye' },
    },
  ]);
  const facts = FACTS.map((fact) => ({ ...fact, body: city[fact.key] }));
  const related = city.related.flatMap((id) => {
    const item = cityById(id);
    return item ? [item] : [];
  });

  return (
    <article>
      <JsonLd data={jsonLd} />
      <header className="city-hero">
        <div className="wrap">
          <Breadcrumbs items={crumbs} />
          <p className="kicker">Karadeniz</p>
          <h1>{city.name}</h1>
          <p className="lead">{city.intro}</p>
          <OfflineTools kind="city" title={city.name} href={`/city/${city.id}`} />
          <ShareBar path={absoluteUrl(`/city/${city.id}`)} title={`${city.name} · Vora`} />
          <nav className="jump" aria-label={`${city.name} bölümleri`}>
            <a href="#tani">Şehri tanı</a>
            {city.topics.length > 0 ? <a href="#konular">Konular</a> : null}
            <a href="#insanlar">İnsanlar</a>
            <a href="#paylasimlar">Paylaşımlar</a>
            <a href="#etkinlikler">Etkinlikler</a>
            <a href="#blog">Yazılar</a>
            <a href="#yakin">Yakın iller</a>
          </nav>
        </div>
      </header>
      <div className="wrap block">
        <section id="tani" className="atlas-section">
          <div className="section-head">
            <h2>{`${city.name} şehrinde Vora`}</h2>
            <p>Tarih, sosyal hayat, kültür, yerel duraklar ve Vora topluluğu.</p>
          </div>
          <div className="fact-grid">
            {facts.map((fact) => (
              <article key={fact.key} className="fact-card">
                <span>{fact.label}</span>
                <p>{fact.body}</p>
              </article>
            ))}
          </div>
          <p>
            <Link href="/features/city-rooms">{city.name} şehir odası uygulamada</Link>
          </p>
        </section>

        <section id="konular" className="atlas-section">
          <div className="section-head">
            <h2>Bu şehirde gez</h2>
            <p>Ayrı konu sayfaları yalnızca özgün metin yazıldığında açılır.</p>
          </div>
          {city.topics.length === 0 ? (
            <p className="empty">Bu il için ayrı konu sayfası henüz yok.</p>
          ) : (
            <div className="topic-grid">
              {city.topics.map((topic) => (
                <Link key={topic.slug} href={`/city/${city.id}/${topic.slug}`} className="topic-card">
                  <span>Konu</span>
                  <strong>{topic.title}</strong>
                  <p>{topic.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="insanlar" className="atlas-section">
          <div className="section-head">
            <h2>İnsanlar</h2>
            <p>Bu ile bağlı, herkese açık profiller.</p>
          </div>
          {locals.length === 0 ? (
            <p className="empty">Bu ile bağlı herkese açık profil şu an listelenmiyor.</p>
          ) : (
            <div className="grid-3">
              {locals.map((person) => (
                <Link className="card" key={person.id} href={`/u/${person.username}`}>
                  <h3>{displayName(person.full_name, person.username)}</h3>
                  <p className="meta">@{person.username}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="paylasimlar" className="atlas-section">
          <div className="section-head">
            <h2>Paylaşımlar</h2>
            <p>Yalnızca herkese açık gönderiler.</p>
          </div>
          {posts.length === 0 ? (
            <p className="empty">Bu ilde koşulları sağlayan herkese açık paylaşım yok.</p>
          ) : (
            <div className="grid-2">
              {posts.map((post) => (
                <Link className="card" key={post.id} href={`/p/${post.id}`}>
                  <h3>{postHeadline(post)}</h3>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="etkinlikler" className="atlas-section">
          <div className="section-head">
            <h2>Etkinlikler</h2>
            <p>
              <Link href="/events">Tüm Karadeniz etkinlikleri</Link>
            </p>
          </div>
          {events.length === 0 ? (
            <p className="empty">Yayında etkinlik yok.</p>
          ) : (
            <div className="topic-grid">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="link-card">
                  <strong>{event.title}</strong>
                  <p>{new Date(event.starts_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="blog" className="atlas-section">
          <div className="section-head">
            <h2>Yazılar</h2>
            <p>Bu şehre bağlı yayımlanmış blog yazıları.</p>
          </div>
          {blogs.length === 0 ? (
            <p className="empty">Bu şehre bağlı yayımlanmış blog yazısı yok.</p>
          ) : (
            <div className="topic-grid">
              {blogs.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="link-card">
                  <strong>{post.title}</strong>
                  {post.excerpt ? <p>{post.excerpt}</p> : null}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="yakin" className="atlas-section">
          <div className="section-head">
            <h2>Yakın iller</h2>
            <p>Aynı hat üzerindeki komşu şehir sayfaları.</p>
          </div>
          <div className="city-grid">
            {related.map((item) => (
              <Link key={item.id} href={`/city/${item.id}`} className="city-card">
                <span className="city-mark" aria-hidden="true">
                  {item.name.slice(0, 1).toLocaleUpperCase('tr')}
                </span>
                <span className="city-card-copy">
                  <strong>{item.name}</strong>
                  <span className="city-card-intro">{item.intro}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <CtaBand />
    </article>
  );
}
