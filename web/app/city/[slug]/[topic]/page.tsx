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
    { name: 'Şehirler', path: '/cities' },
    { name: found.city.name, path: `/city/${found.city.id}` },
    { name: found.topic.title, path: `/city/${found.city.id}/${found.topic.slug}` },
  ];
  const siblings = found.city.topics.filter((item) => item.slug !== found.topic.slug);

  return (
    <article>
      <JsonLd data={graph([breadcrumbLd(crumbs)])} />
      <header className="city-hero">
        <div className="wrap">
          <Breadcrumbs items={crumbs} />
          <p className="kicker">{found.city.name}</p>
          <h1>{found.topic.title}</h1>
          <p className="lead">{found.topic.description}</p>
          <nav className="jump" aria-label="Konu gezintisi">
            <Link href={`/city/${found.city.id}`}>{found.city.name} sayfası</Link>
            <Link href="/cities">Tüm şehirler</Link>
          </nav>
        </div>
      </header>
      <div className="wrap block">
        <div className="reading">
          {found.topic.paragraphs.map((paragraph, index) => (
            <p key={paragraph}>
              <strong>{index + 1}. </strong>
              {paragraph}
            </p>
          ))}
        </div>
        {siblings.length > 0 ? (
          <section className="atlas-section">
            <div className="section-head">
              <h2>{found.city.name} içinde diğer konular</h2>
            </div>
            <div className="topic-grid">
              {siblings.map((item) => (
                <Link key={item.slug} href={`/city/${found.city.id}/${item.slug}`} className="topic-card">
                  <span>Konu</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <CtaBand />
    </article>
  );
}
