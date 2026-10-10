import type { Metadata } from 'next';
import { FeedCard } from '@/components/feed-card';
import { listPosts } from '@/lib/data';
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
      <div className="wrap feed-list">
        <h1 className="sr-only">Herkese açık paylaşımlar</h1>
        <div className="feed-filters">
          <span>Tüm iller</span>
          <span>Tüm ilçeler</span>
        </div>
        {posts.length === 0 ? <p className="empty">Koşulları sağlayan paylaşım yok.</p> : null}
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
