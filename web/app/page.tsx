import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/site';
import { CITIES } from '@/lib/cities';
import { displayName, listBlogPosts, listEvents, listPosts, listProfiles, postHeadline, type PublicEvent, type PublicPost, type PublicProfile } from '@/lib/data';
import { graph, toMetadata } from '@/lib/seo/engine';
import { ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL } from '@/lib/site';

const HOME_FAQ = [
  {
    question: 'Vora nedir?',
    answer: 'Vora, Karadeniz şehirlerindeki insanları, etkinlikleri, hizmetleri ve yerel paylaşımları aynı ağda buluşturan bir şehir platformudur.',
  },
  {
    question: 'Web’de hangi içerikler görünür?',
    answer: 'Yalnızca herkese açık ve yayındaki profiller, paylaşımlar, etkinlikler ve blog yazıları listelenir. Taslaklar ve kapalı hesaplar bu sitede yer almaz.',
  },
  {
    question: 'Şehir sayfası ne işe yarar?',
    answer: 'Her ilin sayfası o şehirdeki herkese açık insanları, paylaşımları, etkinlikleri ve yazıları bir arada gösterir. İlçe sayfası ancak gerçek içerik varsa açılır.',
  },
  {
    question: 'Uygulama şart mı?',
    answer: 'Okumak için değil. Paylaşmak, mesajlaşmak ve şehir odasına katılmak için iOS veya Android uygulaması kullanılır.',
  },
];

export const metadata: Metadata = toMetadata({
  title: 'Vora — Karadeniz’in dijital şehir ağı',
  description: 'Şehrindeki insanları, işletmeleri, etkinlikleri, fırsatları ve günlük yaşamı tek yerde keşfet.',
  path: '/',
  index: true,
  type: 'website',
});

function when(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

function initial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase('tr') || '·';
}

export default async function HomePage() {
  const [people, blogs] = await Promise.all([listProfiles(80), listBlogPosts('tr', 3)]);
  const boards = await Promise.all(
    CITIES.map(async (city) => {
      const [posts, events] = await Promise.all([
        listPosts({ regionId: city.id, limit: 3 }),
        listEvents({ regionId: city.id, limit: 3 }),
      ]);
      return { city, posts, events, locals: peopleSafe(people, city.id) };
    }),
  );
  const ranked = [...boards].sort((a, b) => score(b) - score(a));
  const activeId = ranked[0] && score(ranked[0]) > 0 ? ranked[0].city.id : 'trabzon';
  const latest = boards.flatMap((board) => board.posts).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const jsonLd = graph([
    {
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="home-hero">
        <div className="wrap home-hero-grid">
          <div>
            <p className="kicker">Vora</p>
            <h1>Karadeniz’in dijital şehir ağı</h1>
            <p className="lead">Şehrindeki insanları, işletmeleri, etkinlikleri, fırsatları ve günlük yaşamı tek yerde keşfet.</p>
            <div className="home-actions">
              <Link className="btn" href="/explore">Vora’yı keşfet</Link>
              <Link className="btn ghost" href="#sehirler">Şehrini seç</Link>
            </div>
          </div>
          <aside className="live-card" aria-label="Son herkese açık paylaşım">
            <p className="kicker">Ağda son kayıt</p>
            {latest ? (
              <Link href={`/p/${latest.id}`} className="live-link">
                <strong>{postHeadline(latest)}</strong>
                <span>
                  {displayName(latest.author_name, latest.author_username)}
                  {' · '}
                  {cityName(latest.region_id)}
                </span>
              </Link>
            ) : (
              <p className="empty">Herkese açık paylaşım yok.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="band" id="sehirler">
        <div className="wrap">
          <h2>Şehrini seç</h2>
          <p className="lead">Bir ili seç. O şehirdeki herkese açık insanlar, paylaşımlar ve etkinlikler açılır.</p>
          <div className="city-switch">
            <div className="city-pick" role="radiogroup" aria-label="Şehir">
              {boards.map((board) => (
                <div key={board.city.id}>
                  <input
                    id={`city-${board.city.id}`}
                    className="city-radio"
                    type="radio"
                    name="home-city"
                    defaultChecked={board.city.id === activeId}
                  />
                  <label htmlFor={`city-${board.city.id}`}>
                    {board.city.name}
                    <span>{score(board)}</span>
                  </label>
                </div>
              ))}
            </div>
            {boards.map((board) => (
              <div key={board.city.id} className={`city-board board-${board.city.id}`}>
                <div className="board-head">
                  <h3>{board.city.name}</h3>
                  <Link href={`/city/${board.city.id}`}>{board.city.name} sayfası</Link>
                </div>
                <div className="board-col">
                  <h3>İnsanlar</h3>
                  {board.locals.length === 0 ? <p className="empty">Herkese açık profil yok.</p> : board.locals.map((person) => (
                    <Link key={person.id} href={`/u/${person.username}`} className="person-line">
                      <span className="avatar">
                        {person.avatar_url ? <img src={person.avatar_url} alt="" /> : initial(displayName(person.full_name, person.username))}
                      </span>
                      <span>
                        <strong>{displayName(person.full_name, person.username)}</strong>
                        <small>@{person.username}</small>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="board-col">
                  <h3>Paylaşımlar</h3>
                  {board.posts.length === 0 ? <p className="empty">Herkese açık paylaşım yok.</p> : board.posts.map((post) => (
                    <Link key={post.id} href={`/p/${post.id}`} className="post-line">
                      {post.media_urls[0] ? <img src={post.media_urls[0]} alt="" /> : null}
                      <span>
                        <strong>{postHeadline(post)}</strong>
                        <small>{displayName(post.author_name, post.author_username)}</small>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="board-col">
                  <h3>Etkinlikler</h3>
                  {board.events.length === 0 ? <p className="empty">Yayında etkinlik yok.</p> : board.events.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="post-line">
                      <span>
                        <strong>{event.title}</strong>
                        <small>{when(event.starts_at)}{event.location_name ? ` · ${event.location_name}` : ''}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band" id="is">
        <div className="wrap">
          <h2>Ağda gezin</h2>
          <div className="action-row">
            <Link href="/posts">Paylaşımlar</Link>
            <Link href="/events">Etkinlikler</Link>
            <Link href="/people">İnsanlar</Link>
            <Link href="/blog">Blog</Link>
            <Link id="hizmetler" href="/discover">Hizmetler</Link>
            <Link id="pazar" href="/discover">Pazar</Link>
            <Link id="yolculuk" href="/discover">Yolculuk</Link>
          </div>
        </div>
      </section>

      <section className="band" id="blog">
        <div className="wrap">
          <h2>Yazılar</h2>
          {blogs.length === 0 ? <p className="empty">Yayımlanmış blog yazısı yok.</p> : (
            <div className="row-cards">
              {blogs.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="row-card">
                  <strong>{post.title}</strong>
                  <span className="meta-line">{post.excerpt}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="band" id="uygulama">
        <div className="wrap home-hero-grid">
          <div>
            <h2>Vora uygulaması</h2>
            <p className="lead">Şehir odası, mesaj ve paylaşım telefonda. Web okumak ve bulmak içindir.</p>
            <div className="home-actions">
              <a className="btn" href={IOS_APP_STORE_URL}>App Store</a>
              <a className="btn ghost" href={ANDROID_PLAY_STORE_URL}>Google Play</a>
            </div>
          </div>
          <div>
            <h2>Güvenli kullanım</h2>
            <p>
              <Link href="/community-rules">Topluluk kuralları</Link>
              {' · '}
              <Link href="/privacy">Gizlilik</Link>
              {' · '}
              <Link href="/account-deletion">Hesap silme</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="band" id="sss">
        <div className="wrap">
          <h2>Sık sorulanlar</h2>
          {HOME_FAQ.map((item) => (
            <article key={item.question} className="row-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function peopleSafe(people: PublicProfile[], regionId: string) {
  return people.filter((person) => person.region_id === regionId).slice(0, 4);
}

function score(board: { posts: PublicPost[]; events: PublicEvent[]; locals: PublicProfile[] }) {
  return board.posts.length + board.events.length + board.locals.length;
}

function cityName(regionId: string) {
  return CITIES.find((city) => city.id === regionId)?.name ?? '';
}
