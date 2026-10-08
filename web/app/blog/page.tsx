import type { Metadata } from 'next';
import Link from 'next/link';
import { listBlogPosts } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Blog',
  description: 'Karadeniz, şehir rehberleri, sosyal yaşam ve Vora topluluğu üzerine yayımlanmış yazılar.',
  path: '/blog',
  index: true,
  type: 'website',
});

export default async function BlogIndexPage() {
  const posts = await listBlogPosts('tr', 24);
  return (
    <section className="block">
      <div className="wrap">
        <h1>Blog</h1>
        <p className="muted">Yazılar admin panelinden yayımlanır. Otomatik üretilmiş haber yoktur.</p>
        {posts.length === 0 ? (
          <p className="empty">Henüz yayımlanmış yazı yok.</p>
        ) : (
          <div className="grid-3">
            {posts.map((post) => (
              <Link className="card" key={post.id} href={`/blog/${post.slug}`}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
