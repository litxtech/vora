import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand, JsonLd, ShareBar } from '@/components/site';
import { cityById } from '@/lib/cities';
import { displayName, listBlogByCity, listEvents, listPosts, listProfiles, postHeadline } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { slug: string };

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

  return (
    <article className="block">
      <JsonLd data={jsonLd} />
      <div className="wrap prose">
        <Breadcrumbs items={crumbs} />
        <h1>{city.name}</h1>
        <p>{city.intro}</p>
        <ShareBar path={absoluteUrl(`/city/${city.id}`)} title={`${city.name} · Vora`} />
        <h2>Şehir hakkında</h2>
        <p>{city.history}</p>
        <h2>Sosyal yaşam</h2>
        <p>{city.social}</p>
        <h2>Kültürel yapı</h2>
        <p>{city.culture}</p>
        <h2>Yerel özellikler</h2>
        <p>{city.local}</p>
        <h2>Vora topluluğu</h2>
        <p>{city.community}</p>
        <p>
          <Link href="/features/city-rooms">{city.name} şehir odası uygulamada</Link>
        </p>
      </div>
      <div className="wrap">
        <h2>{city.name}’u keşfet</h2>
        {city.topics.length > 0 ? (
          <ul>
            {city.topics.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/city/${city.id}/${topic.slug}`}>{topic.title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Bu il için ayrı konu sayfası, özgün metin yazılmadan açılmadı.</p>
        )}
        <h2>{city.name}’daki Vora kullanıcıları</h2>
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
        <h2>{city.name}’dan son paylaşımlar</h2>
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
        <h2>{city.name}’daki etkinlikler</h2>
        {events.length === 0 ? (
          <p className="empty">Yayında etkinlik yok.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>{event.title}</Link>
              </li>
            ))}
          </ul>
        )}
        <h2>{city.name} rehberleri</h2>
        {blogs.length === 0 ? (
          <p className="empty">Bu şehre bağlı yayımlanmış blog yazısı yok.</p>
        ) : (
          <ul>
            {blogs.map((post) => (
              <li key={post.id}>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </li>
            ))}
          </ul>
        )}
        <h2>İlgili şehirler</h2>
        <ul>
          {city.related.map((id) => {
            const related = cityById(id);
            return related ? (
              <li key={id}>
                <Link href={`/city/${related.id}`}>{related.name}</Link>
              </li>
            ) : null;
          })}
        </ul>
      </div>
      <CtaBand />
    </article>
  );
}
