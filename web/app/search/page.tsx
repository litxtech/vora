import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { listPosts, postHeadline } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Arama',
  description: 'Vora içinde şehir, insan ve paylaşım ara.',
  path: '/search',
  index: false,
  follow: false,
  type: 'website',
});

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim().toLowerCase();
  const posts = query ? (await listPosts({ limit: 40 })).filter((post) => post.content.toLowerCase().includes(query) || (post.title ?? '').toLowerCase().includes(query)) : [];
  const cities = query ? CITIES.filter((city) => city.name.toLowerCase().includes(query) || city.id.includes(query)) : [];
  return (
    <section className="block">
      <div className="wrap">
        <h1>Arama</h1>
        <form action="/search">
          <label htmlFor="q">Ara</label>
          <input id="q" name="q" defaultValue={q ?? ''} />
          <button className="btn" type="submit">
            Ara
          </button>
        </form>
        <ul>
          {cities.map((city) => (
            <li key={city.id}>
              <Link href={`/city/${city.id}`}>{city.name}</Link>
            </li>
          ))}
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
