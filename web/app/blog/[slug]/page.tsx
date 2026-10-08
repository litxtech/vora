import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Breadcrumbs, CtaBand, JsonLd, ShareBar } from '@/components/site';
import { cityById } from '@/lib/cities';
import { findRedirect, getBlogPost, listBlogPosts } from '@/lib/data';
import { parseVideo, renderMarkdown } from '@/lib/markdown';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';
import { absoluteUrl } from '@/lib/site';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug, 'tr');
  if (!post) return { title: 'Yazı bulunamadı', robots: { index: false, follow: false } };
  const path = `/blog/${post.slug}`;
  return toMetadata({
    title: post.seo_title || post.title,
    description: trimDescription(post.seo_description || post.excerpt || post.content),
    path,
    index: post.content.trim().length > 80,
    type: 'article',
    image: post.og_image_url || post.cover_image_url,
    language: 'tr',
    publishedAt: post.published_at,
    modifiedAt: post.updated_at,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug, 'tr');
  if (!post) {
    const jump = await findRedirect(`/blog/${slug}`);
    if (jump) {
      if (jump.status_code === 302) redirect(jump.to_path);
      permanentRedirect(jump.to_path);
    }
    notFound();
  }
  const city = post.city_slug ? cityById(post.city_slug) : undefined;
  const related = (await listBlogPosts('tr', 8)).filter((item) => item.id !== post.id).slice(0, 3);
  const video = parseVideo(post.video_url);
  const faqs = post.faqs.filter((item) => item.question?.trim() && item.answer?.trim());
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const nodes: Record<string, unknown>[] = [
    breadcrumbLd(crumbs),
    {
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      inLanguage: post.language,
      author: { '@type': 'Person', name: post.author_name },
      image: post.cover_image_url ?? undefined,
      mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    },
  ];
  if (faqs.length > 0) {
    nodes.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }
  if (video) {
    nodes.push({
      '@type': 'VideoObject',
      name: post.title,
      description: post.excerpt || post.title,
      thumbnailUrl: post.cover_image_url ?? undefined,
      uploadDate: post.published_at ?? post.updated_at,
      embedUrl: video.kind === 'youtube' ? `https://www.youtube.com/embed/${video.id}` : video.kind === 'vimeo' ? `https://player.vimeo.com/video/${video.id}` : video.url,
    });
  }
  return (
    <article className="block">
      <JsonLd data={graph(nodes)} />
      <div className="wrap prose">
        <Breadcrumbs items={crumbs} />
        <h1>{post.title}</h1>
        <p className="meta">
          {post.author_name}
          {post.published_at ? ` · ${new Date(post.published_at).toLocaleDateString('tr-TR')}` : ''}
          {post.category_name ? ` · ${post.category_name}` : ''}
        </p>
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.cover_image_alt || ''} />
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        {video?.kind === 'youtube' ? (
          <iframe
            title={post.title}
            src={`https://www.youtube.com/embed/${video.id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            width="100%"
            height="360"
          />
        ) : null}
        {video?.kind === 'vimeo' ? (
          <iframe
            title={post.title}
            src={`https://player.vimeo.com/video/${video.id}`}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            width="100%"
            height="360"
          />
        ) : null}
        {video?.kind === 'mp4' ? <video controls src={video.url} /> : null}
        {post.gallery.map((image) => (
          <figure key={image.url}>
            <img src={image.url} alt={image.alt || ''} />
            {image.caption ? <figcaption>{image.caption}</figcaption> : null}
          </figure>
        ))}
        {faqs.length > 0 ? (
          <>
            <h2>Sık sorulanlar</h2>
            {faqs.map((item) => (
              <section key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </section>
            ))}
          </>
        ) : null}
        {post.internal_links.length > 0 ? (
          <>
            <h2>İlgili bağlantılar</h2>
            <ul>
              {post.internal_links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {city ? (
          <p>
            İlgili şehir: <Link href={`/city/${city.id}`}>{city.name}</Link>
          </p>
        ) : null}
        <h2>İlgili yazılar</h2>
        <ul>
          {related.map((item) => (
            <li key={item.id}>
              <Link href={`/blog/${item.slug}`}>{item.title}</Link>
            </li>
          ))}
        </ul>
        <ShareBar path={absoluteUrl(`/blog/${post.slug}`)} title={post.title} />
      </div>
      <CtaBand />
    </article>
  );
}
