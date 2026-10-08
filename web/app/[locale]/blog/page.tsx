import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listBlogPosts } from '@/lib/data';
import { toMetadata } from '@/lib/seo/engine';
import { TRANSLATED_LOCALES, type Locale } from '@/lib/site';

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const posts = await listBlogPosts(locale, 1);
  if (posts.length === 0) return { title: 'Blog', robots: { index: false, follow: false } };
  return toMetadata({
    title: 'Blog',
    description: 'Translated Vora stories.',
    path: `/${locale}/blog`,
    index: true,
    type: 'website',
    language: locale,
  });
}

export default async function LocaleBlogPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const posts = await listBlogPosts(locale, 24);
  if (posts.length === 0) notFound();
  return (
    <section className="block">
      <div className="wrap">
        <h1>Blog</h1>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/${locale}/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function isLocale(value: string): value is Locale {
  return (TRANSLATED_LOCALES as readonly string[]).includes(value);
}
