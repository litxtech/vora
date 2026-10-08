import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Yönetim',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap admin block">
      <nav aria-label="Yönetim">
        <Link href="/admin">Özet</Link>
        <Link href="/admin/blog">Blog</Link>
        <Link href="/admin/blog/new">Yeni yazı</Link>
        <Link href="/admin/media">Medya</Link>
        <Link href="/admin/seo">SEO</Link>
        <Link href="/admin/redirects">Yönlendirmeler</Link>
        <Link href="/admin/pages">Sayfalar</Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
