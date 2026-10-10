import type { Metadata } from 'next';
import Link from 'next/link';
import { CITIES } from '@/lib/cities';
import { toMetadata } from '@/lib/seo/engine';

export const metadata: Metadata = toMetadata({
  title: 'Şehir liderleri',
  description: 'Vora’da şehir liderliği, il topluluğunun uygulama içindeki yönetim yüzüdür.',
  path: '/city-leaders',
  index: true,
  type: 'website',
});

export default function CityLeadersPage() {
  return (
    <article className="block atlas">
      <div className="wrap">
        <p className="kicker">Şehir yönetimi</p>
        <h1>Şehir liderleri</h1>
        <p className="lead">
          Lider, bir ilin Vora topluluğunda meclis ve diplomasi hattının parçasıdır. Görev uygulama içindedir. Bu sayfa kişi listesi, telefon, adres veya özel mesaj yayınlamaz.
        </p>
        <div className="atlas-note">
          <span>Kişi listesi yok</span>
          <span>İletişim bilgisi yok</span>
          <span>Herkese açık yüz şehir sayfasında</span>
        </div>
        <section className="belt">
          <div className="belt-head">
            <div>
              <h2>İlin herkese açık sayfası</h2>
              <p>Liderliği görmek için uygulamaya geç. Web’de şehrin açık yüzeyini oku.</p>
            </div>
          </div>
          <div className="city-grid">
            {CITIES.map((city) => (
              <Link key={city.id} href={`/city/${city.id}`} className="city-card">
                <span className="city-mark" aria-hidden="true">
                  {city.name.slice(0, 1).toLocaleUpperCase('tr')}
                </span>
                <span className="city-card-copy">
                  <strong>{city.name}</strong>
                  <span className="city-card-intro">{city.community}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
