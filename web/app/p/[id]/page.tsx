import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostEngage } from '@/components/post-engage';
import { Breadcrumbs, CtaBand, JsonLd, ShareBar } from '@/components/site';
import { cityById } from '@/lib/cities';
import { displayName, getPost, listPosts, postHeadline, postSeo } from '@/lib/data';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'Paylaşım bulunamadı', robots: { index: false, follow: false } };
  const seo = postSeo(post);
  const city = cityById(post.region_id);
  return toMetadata({
    title: postHeadline(post),
    description: trimDescription(post.content),
    path: `/p/${post.id}`,
    index: seo.index,
    type: 'article',
    image: post.media_urls[0] ?? null,
    publishedAt: post.created_at,
    modifiedAt: post.updated_at,
    breadcrumbs: [
      { name: 'Ana sayfa', path: '/' },
      { name: city?.name ?? 'Şehir', path: city ? `/city/${city.id}` : '/cities' },
      { name: 'Paylaşım', path: `/p/${post.id}` },
    ],
  });
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const city = cityById(post.region_id);
  const related = (await listPosts({ regionId: post.region_id, limit: 5 })).filter((item) => item.id !== post.id).slice(0, 3);
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'Paylaşımlar', path: '/posts' },
    { name: city?.name ?? post.region_id, path: city ? `/city/${city.id}` : '/cities' },
    { name: postHeadline(post), path: `/p/${post.id}` },
  ];
  const jsonLd = graph([
    breadcrumbLd(crumbs),
    {
      '@type': 'SocialMediaPosting',
      headline: postHeadline(post),
      articleBody: post.content,
      datePublished: post.created_at,
      dateModified: post.updated_at,
      url: absoluteUrl(`/p/${post.id}`),
      author: {
        '@type': 'Person',
        name: displayName(post.author_name, post.author_username),
        url: absoluteUrl(`/u/${post.author_username}`),
      },
      ...(post.media_urls[0] ? { image: post.media_urls[0] } : {}),
    },
  ]);
  return (
    <article className="block">
      <JsonLd data={jsonLd} />
      <div className="wrap prose">
        <Breadcrumbs items={crumbs} />
        <h1>{postHeadline(post)}</h1>
        <p className="meta">
          <Link href={`/u/${post.author_username}`}>{displayName(post.author_name, post.author_username)}</Link>
          {' · '}
          {city ? <Link href={`/city/${city.id}`}>{city.name}</Link> : post.region_id}
          {' · '}
          <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString('tr-TR')}</time>
          {' · '}
          {post.category}
        </p>
        {post.media_urls.map((url) => (
          <p key={url}>
            <img className="media" src={url} alt="" />
          </p>
        ))}
        {post.content.split('\n').map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ShareBar path={absoluteUrl(`/p/${post.id}`)} title={postHeadline(post)} />
        <PostEngage postId={post.id} />
        <h2>{city?.name ?? 'Şehir'}’deki diğer paylaşımlar</h2>
        <ul>
          {related.map((item) => (
            <li key={item.id}>
              <Link href={`/p/${item.id}`}>{postHeadline(item)}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href={`/u/${post.author_username}`}>{displayName(post.author_name, post.author_username)} profilini görüntüle</Link>
        </p>
      </div>
      <CtaBand />
    </article>
  );
}
