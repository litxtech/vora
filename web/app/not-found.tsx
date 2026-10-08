import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="block">
      <div className="wrap prose">
        <h1>Bu sayfa yok</h1>
        <p>Adres değişmiş, içerik silinmiş veya hiç yayımlanmamış olabilir.</p>
        <p>
          <Link href="/">Ana sayfaya dön</Link>
        </p>
      </div>
    </section>
  );
}
