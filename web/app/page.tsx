import Link from 'next/link';
import { CityLinks, JsonLd, StoreBadges } from '@/components/site';
import { CITIES, cityById } from '@/lib/cities';
import { displayName, listBlogPosts, listEvents, listPosts, listProfiles, postHeadline } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, websiteLd } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

const FEATURES = [
  {
    href: '/cities',
    kicker: 'Şehir',
    title: 'İlinin gündemini gör',
    text: 'Trabzon’dan Zonguldak’a her ilin kendi sayfası var. Paylaşım, insan ve etkinlik aynı şehirde toplanır.',
  },
  {
    href: '/events',
    kicker: 'Etkinlik',
    title: 'Konser ve buluşmayı kaçırma',
    text: 'Festival, toplantı ve mahalle etkinlikleri tarih ve yerle listelenir. Şehrindeki programa buradan bak.',
  },
  {
    href: '/app/centers/yolculuk',
    kicker: 'Yolculuk',
    title: 'Boş koltuğu paylaş',
    text: 'İller arası gidişte boş koltuk aç veya yol arkadaşı bul. Aynı yöne giden kişiler tek listede durur.',
  },
  {
    href: '/app/centers/personel',
    kicker: 'İş',
    title: 'İş ara, ilan ver',
    text: 'Şehrindeki iş ilanlarına bak, başvuru yap veya kendi ilanını aç. Personel merkezi bunun için durur.',
  },
  {
    href: '/app/centers/pazar',
    kicker: 'Pazar',
    title: 'İkinci eli yakından sat',
    text: 'Takas ve al-sat ilanları yerel pazarda. Uzak bir siteye değil, kendi ilindeki ilanlara bakarsın.',
  },
  {
    href: '/app/centers/hizmetler',
    kicker: 'Usta',
    title: 'Usta ve hizmet bul',
    text: 'Tamir, taşıma veya günlük iş için şehrindeki hizmet verenleri gör ve talep bırak.',
  },
  {
    href: '/app/centers/kayip',
    kicker: 'Kayıp',
    title: 'Kayıp ve buluntuyu duyur',
    text: 'Kayıp hayvan, eşya veya bir duyuru mahallede daha çabuk yayılır. İlanı şehrine yaz.',
  },
  {
    href: '/app/centers/yardim',
    kicker: 'Yardım',
    title: 'Yardım iste veya gönüllü ol',
    text: 'Bir iş için ele gerekince talep aç. Gönüllü olanlar aynı şehirde bu listeyi görür.',
  },
] as const;

const FAQS = [
  {
    q: 'Vora nedir?',
    a: 'Vora, Karadeniz illerinde yaşayan insanların şehir gündemini, etkinliklerini, yolculuklarını, iş ilanlarını ve birbirleriyle yazışmasını aynı hesapta toplayan sosyal platformdur.',
  },
  {
    q: 'Hangi illerde kullanılır?',
    a: 'Trabzon, Rize, Artvin, Giresun, Ordu, Samsun, Sinop, Amasya, Tokat, Çorum, Kastamonu, Bartın, Karabük, Zonguldak, Bolu, Düzce, Gümüşhane ve Bayburt. Her ilin kendi sayfası vardır.',
  },
  {
    q: 'Web ile telefon aynı hesap mı?',
    a: 'Evet. Kayıt olduğun e-posta ve şifre hem sitede hem uygulamada geçerlidir. Mesaj, profil ve paylaşım aynı hesaba yazılır.',
  },
  {
    q: 'Kimler katılabilir?',
    a: 'Vora 18 yaş ve üzeri içindir. Kayıtta koşulları ve gizlilik metnini kabul etmen gerekir.',
  },
] as const;

export const metadata = toMetadata({
  title: 'Vora — Karadeniz’de şehir, iş, yolculuk ve etkinlik',
  description:
    'Karadeniz’de şehir gündemi, etkinlik, paylaşımlı yolculuk, iş ilanı ve yerel pazar. Vora ile şehrindeki işleri tek hesapta hallet.',
  path: '/',
  index: true,
  type: 'website',
  breadcrumbs: [{ name: 'Ana sayfa', path: '/' }],
});

export default async function HomePage() {
  const [posts, people, events, blogs] = await Promise.all([
    listPosts({ limit: 4 }),
    listProfiles(4),
    listEvents({ limit: 4 }),
    listBlogPosts('tr', 3),
  ]);
  const jsonLd = graph([
    websiteLd(),
    breadcrumbLd([{ name: 'Ana sayfa', path: '/' }]),
    {
      '@type': 'ItemList',
      name: 'Vora özellikleri',
      itemListElement: FEATURES.map((feature, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: feature.title,
        description: feature.text,
        url: absoluteUrl(feature.href),
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="hero home-hero">
        <div className="wrap hero-grid">
          <div>
            <p className="home-kicker">Karadeniz’in dijital ağı</p>
            <h1>Şehrindeki işler, tek yerde.</h1>
            <p className="lead">
              Etkinliği gör, boş koltuğu paylaş, iş ilanına bak, kayıp duyurusunu yaz ve komşunla konuş. Vora, Karadeniz’de yaşayanların günlük işini kolaylaştırmak için kuruldu.
            </p>
            <div className="hero-actions">
              <Link className="btn" href="/register">
                Ücretsiz kayıt ol
              </Link>
              <Link className="btn secondary" href="/login">
                Giriş yap
              </Link>
              <Link className="btn secondary" href="/cities">
                İllere bak
              </Link>
            </div>
            <StoreBadges />
            <CityLinks ids={['trabzon', 'rize', 'ordu', 'giresun', 'samsun', 'sinop', 'zonguldak']} />
          </div>
          <aside className="panel">
            <strong>Bugün ne yapabilirsin?</strong>
            <Link className="home-stat" href="/events">
              <span>Etkinliklere bak</span>
              <strong>Aç</strong>
            </Link>
            <Link className="home-stat" href="/posts">
              <span>Şehir paylaşımları</span>
              <strong>Aç</strong>
            </Link>
            <Link className="home-stat" href="/people">
              <span>İnsanları gör</span>
              <strong>Aç</strong>
            </Link>
            <Link className="home-stat" href="/app/centers/yolculuk">
              <span>Yolculuk ilanları</span>
              <strong>Aç</strong>
            </Link>
          </aside>
        </div>
      </section>

      <section className="block" id="ozellikler">
        <div className="wrap">
          <div className="section-head">
            <h2>Günü kolaylaştıran özellikler</h2>
            <p>
              Her kart, uygulamada karşılığı olan bir merkezdir. Hesabınla girince ilanları görür ve kendi ilanını yazarsın.
            </p>
          </div>
          <div className="life-grid">
            {FEATURES.map((feature) => (
              <Link className="life-card" key={feature.href} href={feature.href}>
                <span>{feature.kicker}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <h2>Üç adımda başla</h2>
            <p>Web ve telefon aynı hesabı kullanır. Kayıt olduktan sonra kaldığın yerden devam edersin.</p>
          </div>
          <div className="steps">
            <article className="step">
              <b>1</b>
              <h3>İlini seç</h3>
              <p>Profilin bir Karadeniz iline bağlanır. Gördüğün gündem o şehre göre açılır.</p>
            </article>
            <article className="step">
              <b>2</b>
              <h3>Hesabını aç</h3>
              <p>18 yaş ve üzeri için ücretsiz kayıt. E-posta ve şifre uygulamada da geçerlidir.</p>
            </article>
            <article className="step">
              <b>3</b>
              <h3>İlanını yaz veya bak</h3>
              <p>Yolculuk, iş, pazar, etkinlik veya bir duyuru. Şehrindeki listeye eklersin.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <h2>18 Karadeniz ili</h2>
            <p>Her ilin metni o şehre aittir. Şehir sayfasından paylaşımlara ve etkinliklere geçersin.</p>
          </div>
          <div className="grid-3">
            {CITIES.slice(0, 6).map((city) => (
              <Link className="card" key={city.id} href={`/city/${city.id}`}>
                <h3>{city.name}</h3>
                <p className="meta">{city.intro}</p>
              </Link>
            ))}
          </div>
          <p>
            <Link href="/cities">Tüm iller</Link>
          </p>
        </div>
      </section>

      {posts.length > 0 ? (
        <section className="block">
          <div className="wrap">
            <h2>Son paylaşımlar</h2>
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
          </div>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section className="block">
          <div className="wrap">
            <h2>Yaklaşan etkinlikler</h2>
            <div className="grid-2">
              {events.map((event) => (
                <Link className="card" key={event.id} href={`/events/${event.id}`}>
                  <h3>{event.title}</h3>
                  <p className="meta">{new Date(event.starts_at).toLocaleDateString('tr-TR')}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {people.length > 0 ? (
        <section className="block">
          <div className="wrap">
            <h2>İnsanlar</h2>
            <div className="grid-4">
              {people.map((person) => (
                <Link className="card" key={person.id} href={`/u/${person.username}`}>
                  <h3>{displayName(person.full_name, person.username)}</h3>
                  <p className="meta">@{person.username}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {blogs.length > 0 ? (
        <section className="block">
          <div className="wrap">
            <h2>Rehber yazılar</h2>
            <div className="grid-3">
              {blogs.map((post) => (
                <Link className="card" key={post.id} href={`/blog/${post.slug}`}>
                  <h3>{post.title}</h3>
                  <p className="meta">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <h2>Sık sorulanlar</h2>
          </div>
          <div className="faq">
            {FAQS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap home-cta">
          <div>
            <h2>Hesabını aç, şehrine geç.</h2>
            <p>Kayıt ücretsizdir. Aynı hesap telefon uygulamasında da açılır.</p>
            <StoreBadges />
          </div>
          <Link className="btn" href="/register">
            Kayıt ol
          </Link>
        </div>
      </section>
    </>
  );
}
