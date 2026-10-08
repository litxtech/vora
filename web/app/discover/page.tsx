import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { listBlogPosts, listEvents, listHashtags, listPosts, postHeadline } from '@/lib/data';
import { TOPICS } from '@/lib/topics';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'İçerik akışı',
  description: 'Son paylaşımlar, şehirler, konular, bloglar ve yaklaşan etkinlikler.',
  path: '/discover',
  index: true,
  type: 'website',
});

export default async function DiscoverPage() {
  const [posts, tags, blogs, events] = await Promise.all([
    listPosts({ limit: 8 }),
    listHashtags(12),
    listBlogPosts('tr', 4),
    listEvents({ limit: 4 }),
  ]);
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() >= Date.now());
  return (
    <section className="block">
      <div className="wrap">
        <h1>İçerik akışı</h1>
        <h2>Son paylaşımlar</h2>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
            </li>
          ))}
        </ul>
        <h2>Şehirler</h2>
        <ul>
          {CITIES.slice(0, 8).map((city) => (
            <li key={city.id}>
              <Link href={`/city/${city.id}`}>{city.name}</Link>
            </li>
          ))}
        </ul>
        <h2>Konular</h2>
        <ul>
          {TOPICS.map((topic) => (
            <li key={topic.slug}>
              <Link href={`/topics/${topic.slug}`}>{topic.title}</Link>
            </li>
          ))}
        </ul>
        <h2>Etiketler</h2>
        {tags.length === 0 ? <p className="empty">Yeterli herkese açık içeriği olan etiket yok.</p> : null}
        <ul>
          {tags.map((tag) => (
            <li key={tag.tag}>
              <Link href={`/hashtag/${tag.tag}`}>#{tag.tag}</Link>
            </li>
          ))}
        </ul>
        <h2>Son bloglar</h2>
        <ul>
          {blogs.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
        <h2>Yaklaşan etkinlikler</h2>
        <ul>
          {upcoming.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`}>{event.title}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/people">Yeni profiller</Link>
        </p>
      </div>
    </section>
  );
}
