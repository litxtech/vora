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
    <article className="block">
      <div className="wrap prose">
        <h1>Şehir liderleri</h1>
        <p>
          Lider, bir ilin Vora topluluğunda meclis ve diplomasi hattının parçasıdır. Görev uygulama içindedir. Bu sayfa kişi listesi, telefon, adres veya özel mesaj yayınlamaz.
        </p>
        <p>Bir ilin herkese açık yüzü için şehir sayfasına geçin:</p>
        <ul>
          {CITIES.map((city) => (
            <li key={city.id}>
              <Link href={`/city/${city.id}`}>{city.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
