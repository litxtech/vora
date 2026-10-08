import type { Metadata } from 'next';
import { FeatureLinks } from '@/components/site';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Özellikler',
  description: 'Vora’da şehirler, keşfet, paylaşımlar, hikayeler, sesli odalar, meclis, diplomasi ve etkinlikler.',
  path: '/features',
  index: true,
  type: 'website',
});

export default function FeaturesPage() {
  return (
    <section className="block">
      <div className="wrap">
        <h1>Özellikler</h1>
        <p>Aşağıdaki sayfalar mobil uygulamada karşılığı olan özellikleri anlatır.</p>
        <FeatureLinks />
      </div>
    </section>
  );
}
