import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { listBlogPosts, listEvents, listPosts, listProfiles, postHeadline, displayName } from '@/lib/data';
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
    listPosts({ limit: 6 }),
    listProfiles(6),
    listEvents({ limit: 4 }),
    listBlogPosts('tr', 4),
  ]);
  return (
    <section className="block">
      <div className="wrap">
        <h1>Keşfet</h1>
        <p>Uygulamadaki Keşfet sekmesinin herkese açık yüzü. Arama sonuçları bu sayfada üretilmez.</p>
        <h2>Şehirler</h2>
        <div className="grid-4">
          {CITIES.map((city) => (
            <Link key={city.id} href={`/city/${city.id}`}>
              {city.name}
            </Link>
          ))}
        </div>
        <h2>İnsanlar</h2>
        <ul>
          {people.map((person) => (
            <li key={person.id}>
              <Link href={`/u/${person.username}`}>{displayName(person.full_name, person.username)}</Link>
            </li>
          ))}
        </ul>
        <h2>Paylaşımlar</h2>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
            </li>
          ))}
        </ul>
        <h2>Blog</h2>
        <ul>
          {blogs.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
        <h2>Etkinlikler</h2>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`}>{event.title}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/discover">İçerik akışı</Link>
        </p>
      </div>
    </section>
  );
}
