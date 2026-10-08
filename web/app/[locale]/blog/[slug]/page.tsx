import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPost } from '@/lib/data';
import { renderMarkdown } from '@/lib/markdown';
import { toMetadata, trimDescription } from '@/lib/seo/engine';
import { TRANSLATED_LOCALES } from '@/lib/site';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!(TRANSLATED_LOCALES as readonly string[]).includes(locale)) {
    return { robots: { index: false, follow: false } };
  }
  const post = await getBlogPost(slug, locale);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };
  return toMetadata({
    title: post.seo_title || post.title,
    description: trimDescription(post.seo_description || post.excerpt),
    path: `/${locale}/blog/${post.slug}`,
    index: true,
    type: 'article',
    language: locale,
    alternates: [
      { hrefLang: 'tr', path: `/blog/${post.slug}` },
      { hrefLang: locale, path: `/${locale}/blog/${post.slug}` },
    ],
  });
}

export default async function LocaleBlogPostPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!(TRANSLATED_LOCALES as readonly string[]).includes(locale)) notFound();
  const post = await getBlogPost(slug, locale);
  if (!post) notFound();
  return (
    <article className="block">
      <div className="wrap prose">
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      </div>
    </article>
  );
}
