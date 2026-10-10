import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES, type CityPage } from '@/lib/cities';
import { toMetadata } from '@/lib/seo/engine';

const BELTS: { id: string; title: string; text: string; ids: string[] }[] = [
  {
    id: 'dogu',
    title: 'Doğu Karadeniz',
    text: 'Kıyı, yayla ve vadi aynı ilde yan yana durur.',
    ids: ['trabzon', 'rize', 'artvin', 'giresun', 'ordu', 'gumushane', 'bayburt'],
  },
  {
    id: 'orta',
    title: 'Orta Karadeniz',
    text: 'Büyükşehir temposu ile iç kesimin daha yavaş illeri.',
    ids: ['samsun', 'sinop', 'amasya', 'tokat', 'corum'],
  },
  {
    id: 'bati',
    title: 'Batı Karadeniz',
    text: 'Orman, maden ve küçük liman kentleri.',
    ids: ['kastamonu', 'bartin', 'karabuk', 'zonguldak', 'bolu', 'duzce'],
  },
];

export const metadata: Metadata = toMetadata({
  title: 'Karadeniz şehirleri',
  description: 'Vora’daki Karadeniz illeri. Her şehrin özgün tanıtımı, herkese açık paylaşımları ve etkinlikleri.',
  path: '/cities',
  index: true,
  type: 'website',
});

const TOPIC_LABEL: Record<string, string> = {
  'sosyal-yasam': 'Sosyal yaşam',
  'gezilecek-yerler': 'Gezilecek yerler',
  etkinlikler: 'Etkinlikler',
  'yeni-insanlarla-tanisma': 'Tanışma',
};

function initial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase('tr') || '·';
}

function citiesIn(ids: string[]): CityPage[] {
  return ids.flatMap((id) => {
    const city = CITIES.find((item) => item.id === id);
    return city ? [city] : [];
  });
}

function cityBelts() {
  const grouped = new Set(BELTS.flatMap((belt) => belt.ids));
  const rest = CITIES.filter((city) => !grouped.has(city.id)).map((city) => city.id);
  if (rest.length === 0) return BELTS;
  return [...BELTS, { id: 'diger', title: 'Diğer iller', text: 'Listeye yeni eklenen iller.', ids: rest }];
}

export default function CitiesPage() {
  return (
    <section className="block atlas">
      <div className="wrap">
        <p className="kicker">Karadeniz</p>
        <h1>Şehirler</h1>
        <p className="lead">
          Bir il seç. Sayfada o şehrin kısa tanıtımı, herkese açık insanları, paylaşımları, etkinlikleri ve yazıları bir arada durur.
        </p>
        <div className="atlas-note">
          <span>{CITIES.length} il</span>
          <span>Yalnızca herkese açık kayıtlar</span>
          <span>İlçe sayfası ayrı metin varsa açılır</span>
        </div>
        {cityBelts().map((belt) => {
          const cities = citiesIn(belt.ids);
          return (
            <section key={belt.id} className="belt" aria-labelledby={`belt-${belt.id}`}>
              <div className="belt-head">
                <div>
                  <h2 id={`belt-${belt.id}`}>{belt.title}</h2>
                  <p>{belt.text}</p>
                </div>
                <span>{cities.length} il</span>
              </div>
              <div className="city-grid">
                {cities.map((city) => (
                  <Link key={city.id} href={`/city/${city.id}`} className="city-card">
                    <span className="city-mark" aria-hidden="true">
                      {initial(city.name)}
                    </span>
                    <span className="city-card-copy">
                      <strong>{city.name}</strong>
                      <span className="city-card-intro">{city.intro}</span>
                      {city.topics.length > 0 ? (
                        <span className="topic-pills">
                          {city.topics.slice(0, 2).map((topic) => (
                            <span key={topic.slug}>{TOPIC_LABEL[topic.slug] ?? topic.title}</span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
