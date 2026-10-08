import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, CtaBand } from '@/components/site';
import { featureBySlug } from '@/lib/features';
import { toMetadata, trimDescription } from '@/lib/seo/engine';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) return { title: 'Özellik bulunamadı', robots: { index: false, follow: false } };
  return toMetadata({
    title: feature.title,
    description: trimDescription(feature.description),
    path: `/features/${feature.slug}`,
    index: true,
    type: 'website',
  });
}

export default async function FeaturePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) notFound();
  return (
    <article className="block">
      <div className="wrap prose">
        <Breadcrumbs
          items={[
            { name: 'Ana sayfa', path: '/' },
            { name: 'Özellikler', path: '/features' },
            { name: feature.title, path: `/features/${feature.slug}` },
          ]}
        />
        <h1>{feature.title}</h1>
        {feature.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          <Link href="/download">Uygulamayı indir</Link>
        </p>
      </div>
      <CtaBand />
    </article>
  );
}
