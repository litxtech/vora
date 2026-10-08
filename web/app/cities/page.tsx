import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Karadeniz şehirleri',
  description: 'Vora’daki Karadeniz illeri. Her şehrin özgün tanıtımı, herkese açık paylaşımları ve etkinlikleri.',
  path: '/cities',
  index: true,
  type: 'website',
});

export default function CitiesPage() {
  return (
    <section className="block">
      <div className="wrap">
        <h1>Şehirler</h1>
        <p>Liste, uygulamadaki Karadeniz il kimlikleriyle aynıdır.</p>
        <div className="grid-3">
          {CITIES.map((city) => (
            <Link className="card" key={city.id} href={`/city/${city.id}`}>
              <h2>{city.name}</h2>
              <p className="meta">{city.intro}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
