import Link from 'next/link';
import { CityLinks, CtaBand, JsonLd, StoreBadges } from '@/components/site';
import { CITIES, cityById } from '@/lib/cities';
import { displayName, listBlogPosts, listEvents, listPosts, listProfiles, postHeadline } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, websiteLd } from '@/lib/seo/engine';

export const metadata = toMetadata({
  title: 'Vora — Karadeniz’in canlı dijital ağı',
  description:
    'Şehrini keşfet, komşularınla bağ kur ve Karadeniz’deki paylaşımları Vora’da gör. Giriş yap, kayıt ol veya uygulamayı indir.',
  path: '/',
  index: true,
  type: 'website',
  breadcrumbs: [{ name: 'Ana sayfa', path: '/' }],
});

export default async function HomePage() {
  const [posts, people, events, blogs] = await Promise.all([
    listPosts({ limit: 6 }),
    listProfiles(6),
    listEvents({ limit: 4 }),
    listBlogPosts('tr', 3),
  ]);
  const jsonLd = graph([websiteLd(), breadcrumbLd([{ name: 'Ana sayfa', path: '/' }])]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <img src="/vora-logo.png" alt="Vora" width={72} height={72} />
            <h1>Karadeniz’in canlı dijital ağı.</h1>
            <p className="lead">
              Şehrinin nabzını tut, komşularınla konuş, paylaşım yap ve etkinlikleri kaçırma. Web’de hesabınla devam et; aynı hesap telefonda da açık.
            </p>
            <div className="hero-actions">
              <Link className="btn" href="/register">
                Kayıt ol
              </Link>
              <Link className="btn secondary" href="/login">
                Giriş yap
              </Link>
              <Link className="btn secondary" href="/app">
                Uygulamayı aç
              </Link>
            </div>
            <StoreBadges />
            <CityLinks ids={['trabzon', 'rize', 'artvin', 'giresun', 'ordu', 'samsun', 'sinop']} />
          </div>
          <aside className="panel">
            <strong>Bugün Vora’da</strong>
            <p>Şehrini seç, insanları gör, son paylaşımlara göz at.</p>
            <p>
              <Link href="/cities">18 Karadeniz ili</Link>
            </p>
            <p>
              <Link href="/people">İnsanları keşfet</Link>
            </p>
            <p>
              <Link href="/events">Etkinlikler</Link>
            </p>
            <p>
              <Link href="/posts">Paylaşımlar</Link>
            </p>
          </aside>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Neler yapabilirsin?</h2>
          <div className="grid-3">
            <article className="card">
              <h3>Paylaş</h3>
              <p>Şehrinden metin paylaş, beğen ve yorum yaz.</p>
            </article>
            <article className="card">
              <h3>Yazış</h3>
              <p>Tanıdığın kişilerle mesajlaş, bildirimlerini takip et.</p>
            </article>
            <article className="card">
              <h3>Şehrini bul</h3>
              <p>İlini seç, komşularını ve o şehirdeki etkinlikleri gör.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Karadeniz şehirleri</h2>
          <div className="grid-3">
            {CITIES.slice(0, 6).map((city) => (
              <Link className="card" key={city.id} href={`/city/${city.id}`}>
                <h3>{city.name}</h3>
                <p className="meta">{city.intro}</p>
              </Link>
            ))}
          </div>
          <p>
            <Link href="/cities">Tüm şehirler</Link>
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>İnsanlar</h2>
          {people.length === 0 ? (
            <p className="empty">Herkese açık profiller burada görünecek.</p>
          ) : (
            <div className="grid-3">
              {people.map((person) => (
                <Link className="card" key={person.id} href={`/u/${person.username}`}>
                  <h3>{displayName(person.full_name, person.username)}</h3>
                  <p className="meta">@{person.username}</p>
                  <p>{person.bio || 'Profili aç'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Son paylaşımlar</h2>
          {posts.length === 0 ? (
            <p className="empty">İlk paylaşımı yapmak için giriş yap.</p>
          ) : (
            <div className="grid-2">
              {posts.map((post) => (
                <Link className="card" key={post.id} href={`/p/${post.id}`}>
                  <h3>{postHeadline(post)}</h3>
                  <p className="meta">
                    {cityById(post.region_id)?.name ?? post.region_id} · @{post.author_username}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Etkinlikler</h2>
          {events.length === 0 ? (
            <p className="empty">Yaklaşan etkinlik olduğunda burada listelenecek.</p>
          ) : (
            <div className="grid-2">
              {events.map((event) => (
                <Link className="card" key={event.id} href={`/events/${event.id}`}>
                  <h3>{event.title}</h3>
                  <p className="meta">{new Date(event.starts_at).toLocaleDateString('tr-TR')}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Blog</h2>
          {blogs.length === 0 ? (
            <p className="empty">Yeni yazılar yayınlandığında burada görünecek.</p>
          ) : (
            <div className="grid-3">
              {blogs.map((post) => (
                <Link className="card" key={post.id} href={`/blog/${post.slug}`}>
                  <h3>{post.title}</h3>
                  <p className="meta">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
