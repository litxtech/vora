import type { Metadata } from 'next';
import Link from 'next/link';
import { TOPICS } from '@/lib/topics';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Konular',
  description: 'Karadeniz, sosyal yaşam, gezi, arkadaşlık ve etkinlikler üzerine konu sayfaları.',
  path: '/topics',
  index: true,
  type: 'website',
});

export default function TopicsPage() {
  return (
    <section className="block">
      <div className="wrap">
        <h1>Konular</h1>
        <div className="grid-2">
          {TOPICS.map((topic) => (
            <Link className="card" key={topic.slug} href={`/topics/${topic.slug}`}>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
