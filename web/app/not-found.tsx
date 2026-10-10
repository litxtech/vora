import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: 'Sayfa bulunamadı · Vora' },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="band">
      <div className="wrap">
        <h1>Aradığın sayfa Vora’da yok.</h1>
        <p className="lead">Adres değişmiş, içerik kaldırılmış veya hiç yayımlanmamış olabilir.</p>
        <div className="home-actions">
          <Link className="btn" href="/">Ana sayfa</Link>
          <Link className="btn ghost" href="/cities">Şehirleri keşfet</Link>
          <Link className="btn ghost" href="/blog">Blog</Link>
          <Link className="btn ghost" href="/events">Etkinlikler</Link>
        </div>
      </div>
    </section>
  );
}
