import Link from 'next/link';
import { CityLinks, CtaBand, FeatureLinks, JsonLd, StoreBadges } from '@/components/site';
import { CITIES } from '@/lib/cities';
import { displayName, listBlogPosts, listEvents, listPosts, listProfiles, postHeadline, postSeo } from '@/lib/data';
import { cityById } from '@/lib/cities';
import { breadcrumbLd, graph, toMetadata, trimDescription, websiteLd } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

export const metadata = toMetadata({
  title: 'Vora — Karadeniz’in canlı dijital ağı',
  description:
    'Şehrini keşfet, komşularınla bağ kur ve Karadeniz’deki herkese açık paylaşımları Vora’da gör. Uygulama App Store ve Google Play’de.',
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
  const visiblePosts = posts.filter((post) => postSeo(post).index);
  const jsonLd = graph([
    websiteLd(),
    breadcrumbLd([{ name: 'Ana sayfa', path: '/' }]),
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <img src="/vora-logo.png" alt="Vora" width={72} height={72} />
            <h1>Karadeniz’in canlı dijital ağı.</h1>
            <p className="lead">
              Şehrinin nabzını tut, komşularınla bağ kur, herkese açık paylaşımları oku. Vora; kıyıdan iç kesime şehir odaları, meclis ve günlük hayat için kurulmuş yerel bir sosyal platformdur.
            </p>
            <div className="hero-actions">
              <StoreBadges />
              <Link className="btn secondary" href="/explore">
                Web’de keşfet
              </Link>
            </div>
            <CityLinks ids={['trabzon', 'rize', 'artvin', 'giresun', 'ordu', 'samsun', 'sinop']} />
          </div>
          <aside className="panel">
            <strong>Bugün web’de görünenler</strong>
            <p className="meta">Yalnızca herkese açık, yayındaki içerik. Uydurma sayaç yok.</p>
            <p>{visiblePosts.length} dizine uygun paylaşım</p>
            <p>{people.length} herkese açık profil listeleniyor</p>
            <p>{events.length} yayındaki etkinlik</p>
            <p>{blogs.length} yayımlanmış blog yazısı</p>
          </aside>
        </div>
      </section>

      <section className="block">
        <div className="wrap prose">
          <h2>Vora nedir?</h2>
          <p>
            Vora, Karadeniz şehirlerini merkeze alan bir sosyal keşif ve iletişim uygulamasıdır. Haber, gönderi, mesaj, etkinlik, şehir odası ve şehir yönetimi aynı hesapta durur. Bu site o uygulamanın tanıtım broşürü değildir; herkese açık şehir, profil, paylaşım, etkinlik ve blog sayfalarını okunur HTML olarak sunar.
          </p>
          <p>
            <Link href="/about">Hakkımızda</Link>
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Neden Vora?</h2>
          <div className="grid-3">
            <article className="card">
              <h3>Şehir bir filtreden fazlası</h3>
              <p>İl kimliği profilde, paylaşımda, etkinlikte ve şehir odasında aynıdır.</p>
            </article>
            <article className="card">
              <h3>Herkese açık olan görünür</h3>
              <p>Arkadaş kitlesi, mesaj ve hassas içerik web sayfasına yazılmaz.</p>
            </article>
            <article className="card">
              <h3>Uygulama duruyor</h3>
              <p>Sesli oda, meclis ve mesajlaşma telefonda kalır. Web onları anlatır, kopyalamaz.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Karadeniz şehirlerini keşfet</h2>
          <p className="muted">Her ilin metni ayrı yazıldı. Aynı paragraf kopyalanmaz.</p>
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
          <h2>İnsanları keşfet</h2>
          {people.length === 0 ? (
            <p className="empty">Henüz web’de listelenecek herkese açık profil yok.</p>
          ) : (
            <div className="grid-3">
              {people.map((person) => (
                <Link className="card" key={person.id} href={`/u/${person.username}`}>
                  <h3>{displayName(person.full_name, person.username)}</h3>
                  <p className="meta">@{person.username}</p>
                  <p>{person.bio || 'Herkese açık profil'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Son herkese açık paylaşımlar</h2>
          {posts.length === 0 ? (
            <p className="empty">Henüz koşulları sağlayan herkese açık paylaşım yok.</p>
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
          <h2>Popüler şehirler</h2>
          <CityLinks ids={['trabzon', 'samsun', 'rize', 'ordu', 'giresun', 'zonguldak']} />
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Vora özellikleri</h2>
          <FeatureLinks />
        </div>
      </section>

      <section className="block">
        <div className="wrap grid-2">
          <article>
            <h2>Şehir odaları</h2>
            <p>Her ilin canlı sesli odası, o şehirle bağı olan kişileri aynı anda bir araya getirir. Konuşma kaydı bu sitede yayımlanmaz.</p>
            <Link href="/features/city-rooms">Şehir odaları</Link>
          </article>
          <article>
            <h2>Şehir liderleri</h2>
            <p>Liderlik uygulama içindeki şehir yönetiminin parçasıdır. Web, kişisel iletişim veya hassas aday bilgisi göstermez.</p>
            <Link href="/city-leaders">Şehir liderleri</Link>
          </article>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Meclis ve diplomasi</h2>
          <p>Meclis şehir gündemini, diplomasi ise iller arasındaki ortak düzeni uygulama içinde taşır.</p>
          <p>
            <Link href="/features/council">Meclis</Link> · <Link href="/features/diplomacy">Diplomasi</Link>
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <h2>Etkinlikler</h2>
          {events.length === 0 ? (
            <p className="empty">Yayında herkese açık etkinlik yok.</p>
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
          <h2>Son blog yazıları</h2>
          {blogs.length === 0 ? (
            <p className="empty">Henüz yayımlanmış blog yazısı yok. Yazılar admin panelinden eklenir.</p>
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

      <section className="block">
        <div className="wrap prose">
          <h2>Vora topluluğu</h2>
          <p>
            Topluluk 18 yaş ve üzeridir. Çocuklara yönelik hesap açılmaz. Herkese açık olan içerik bu sitede okunabilir; özel olan içerik uygulamada kalır.
          </p>
          <p>
            <Link href="/community-rules">Topluluk kuralları</Link>
          </p>
        </div>
      </section>
      <CtaBand />
      <p className="wrap meta">Kanonik adres: {absoluteUrl('/')}</p>
    </>
  );
}
