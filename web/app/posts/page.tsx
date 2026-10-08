import type { Metadata } from 'next';
import Link from 'next/link';
import { cityById } from '@/lib/cities';
import { listPosts, postHeadline } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Herkese açık paylaşımlar',
  description: 'Vora’da yayındaki, herkese açık ve hassas olmayan paylaşımlar.',
  path: '/posts',
  index: true,
  type: 'website',
});

export default async function PostsPage() {
  const posts = await listPosts({ limit: 40 });
  return (
    <section className="block">
      <div className="wrap">
        <h1>Herkese açık paylaşımlar</h1>
        {posts.length === 0 ? <p className="empty">Koşulları sağlayan paylaşım yok.</p> : null}
        <div className="grid-2">
          {posts.map((post) => (
            <Link className="card" key={post.id} href={`/p/${post.id}`}>
              <h2>{postHeadline(post)}</h2>
              <p className="meta">{cityById(post.region_id)?.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
