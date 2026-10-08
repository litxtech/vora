import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHashtag, getPost, listPostIdsByHashtag, postHeadline } from '@/lib/data';
import { hashtagIndexable } from '@/lib/seo/eligibility';
import { toMetadata } from '@/lib/seo/engine';

type Params = { tag: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tag } = await params;
  const row = await getHashtag(tag);
  if (!row) return { title: 'Etiket bulunamadı', robots: { index: false, follow: false } };
  return toMetadata({
    title: `#${row.tag}`,
    description: `${row.tag} etiketindeki herkese açık Vora paylaşımları.`,
    path: `/hashtag/${row.tag}`,
    index: hashtagIndexable(row.indexable_count),
    type: 'website',
  });
}

export default async function HashtagPage({ params }: { params: Promise<Params> }) {
  const { tag } = await params;
  const row = await getHashtag(tag);
  if (!row) notFound();
  const ids = await listPostIdsByHashtag(row.tag);
  const posts = (await Promise.all(ids.map((id) => getPost(id)))).filter((post) => post !== null);
  return (
    <section className="block">
      <div className="wrap">
        <h1>#{row.tag}</h1>
        <p className="meta">{row.indexable_count} herkese açık paylaşım bu eşiği geçtiği için sayfa açıldı.</p>
        <ul>
          {posts.slice(0, 12).map((post) => (
            <li key={post.id}>
              <Link href={`/p/${post.id}`}>{postHeadline(post)}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
