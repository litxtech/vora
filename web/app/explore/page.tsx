import type { Metadata } from 'next';
import Link from 'next/link';
import { FeedCard } from '@/components/feed-card';
import { CITIES } from '@/lib/cities';
import { displayName, listBlogPosts, listEvents, listPosts, listProfiles } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Keşfet',
  description: 'Şehirler, herkese açık insanlar, paylaşımlar, blog yazıları ve etkinlikler.',
  path: '/explore',
  index: true,
  type: 'website',
});

export default async function ExplorePage() {
  const [posts, people, events, blogs] = await Promise.all([
    listPosts({ limit: 8 }),
    listProfiles(8),
    listEvents({ limit: 4 }),
    listBlogPosts('tr', 4),
  ]);
  return (
    <section className="block">
      <div className="wrap">
        <h1>Keşfet</h1>
        <p className="lead">Şehir, insan, paylaşım, etkinlik ve yazı. Liste herkese açık kayıtlardan gelir.</p>
        <form className="disc-search" action="/search">
          <input name="q" placeholder="İsim veya kullanıcı adı ara…" aria-label="Ara" />
        </form>
        <nav className="disc-tabs" aria-label="Keşfet sekmeleri">
          <a href="#gonderiler">Gönderiler</a>
          <Link href="/app/reels">Reels</Link>
          <Link href="/events">Etkinlikler</Link>
          <Link href="/cities">Şehirler</Link>
        </nav>
        <div id="gonderiler" className="feed-list">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} />
          ))}
        </div>
        <h2 className="app-section">İnsanlar</h2>
        <div className="people-list">
          {people.map((person) => (
            <Link key={person.id} href={`/u/${person.username}`} className="person-row">
              <span className="feed-avatar">
                {person.avatar_url ? <img src={person.avatar_url} alt="" /> : displayName(person.full_name, person.username).slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{displayName(person.full_name, person.username)}</strong>
                <small>@{person.username}</small>
              </span>
            </Link>
          ))}
        </div>
        <h2 className="app-section">Etkinlikler</h2>
        <div className="stack">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="event-card">
              <strong>{event.title}</strong>
              <span>{new Date(event.starts_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </Link>
          ))}
        </div>
        <h2 className="app-section">Şehirler</h2>
        <div className="city-list">
          {CITIES.map((city) => (
            <Link key={city.id} href={`/city/${city.id}`}>
              {city.name}
            </Link>
          ))}
        </div>
        <h2 className="app-section">Blog</h2>
        <div className="stack">
          {blogs.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="event-card">
              <strong>{post.title}</strong>
              <span>{post.excerpt}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
