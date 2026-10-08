import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/site';
import { listPosts, postHeadline } from '@/lib/data';
import { topicBySlug } from '@/lib/topics';
import { toMetadata, trimDescription } from '@/lib/seo/engine';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) return { title: 'Konu bulunamadı', robots: { index: false, follow: false } };
  return toMetadata({
    title: topic.title,
    description: trimDescription(topic.description),
    path: `/topics/${topic.slug}`,
    index: true,
    type: 'article',
  });
}

export default async function TopicPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();
  const posts = topic.category ? (await listPosts({ limit: 20 })).filter((post) => post.category === topic.category).slice(0, 6) : [];
  return (
    <article className="block">
      <div className="wrap prose">
        <Breadcrumbs
          items={[
            { name: 'Ana sayfa', path: '/' },
            { name: 'Konular', path: '/topics' },
            { name: topic.title, path: `/topics/${topic.slug}` },
          ]}
        />
        <h1>{topic.title}</h1>
        {topic.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {posts.length > 0 ? (
          <>
            <h2>İlgili paylaşımlar</h2>
            <ul>
              {posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </article>
  );
}
