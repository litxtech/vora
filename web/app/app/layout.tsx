import type { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { requireProfile } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Vora',
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: '/app', label: 'Akış' },
  { href: '/app/explore', label: 'Keşfet' },
  { href: '/app/compose', label: 'Paylaş' },
  { href: '/app/messages', label: 'Mesajlar' },
  { href: '/app/notifications', label: 'Bildirimler' },
  { href: '/app/profile', label: 'Profil' },
  { href: '/events', label: 'Etkinlikler' },
  { href: '/cities', label: 'Şehirler' },
  { href: '/people', label: 'İnsanlar' },
  { href: '/app/settings', label: 'Ayarlar' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireProfile();
  const name = profile?.full_name || profile?.username || user.email || 'Hesabım';
  return (
    <section className="block app-shell">
      <div className="wrap">
        <div className="app-top">
          <div>
            <p className="meta">Merhaba</p>
            <strong>{name}</strong>
          </div>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Çıkış yap
            </button>
          </form>
        </div>
        <nav className="app-nav" aria-label="Uygulama">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </section>
  );
}
