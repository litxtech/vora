import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand, JsonLd } from '@/components/site';
import { cityTopic } from '@/lib/cities';
import { breadcrumbLd, graph, toMetadata, trimDescription } from '@/lib/seo/engine';

type Params = { slug: string; topic: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, topic } = await params;
  const found = cityTopic(slug, topic);
  if (!found) return { title: 'Sayfa bulunamadı', robots: { index: false, follow: false } };
  return toMetadata({
    title: found.topic.title,
    description: trimDescription(found.topic.description),
    path: `/city/${found.city.id}/${found.topic.slug}`,
    index: true,
    type: 'article',
  });
}

export default async function CityTopicPage({ params }: { params: Promise<Params> }) {
  const { slug, topic } = await params;
  const found = cityTopic(slug, topic);
  if (!found) notFound();
  const crumbs = [
    { name: 'Ana sayfa', path: '/' },
    { name: found.city.name, path: `/city/${found.city.id}` },
    { name: found.topic.title, path: `/city/${found.city.id}/${found.topic.slug}` },
  ];
  return (
    <article className="block">
      <JsonLd data={graph([breadcrumbLd(crumbs)])} />
      <div className="wrap prose">
        <Breadcrumbs items={crumbs} />
        <h1>{found.topic.title}</h1>
        {found.topic.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          <Link href={`/city/${found.city.id}`}>{found.city.name} sayfasına dön</Link>
        </p>
      </div>
      <CtaBand />
    </article>
  );
}
