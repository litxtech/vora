'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth-actions';

const TABS = [
  { href: '/app', label: 'Akış', match: (path: string) => path === '/app' },
  { href: '/app/explore', label: 'Keşfet', match: (path: string) => path.startsWith('/app/explore') },
  { href: '/app/reels', label: 'Reels', match: (path: string) => path.startsWith('/app/reels') },
  { href: '/app/compose', label: 'Paylaş', match: (path: string) => path.startsWith('/app/compose'), create: true },
  { href: '/app/messages', label: 'Mesaj', match: (path: string) => path.startsWith('/app/messages') },
  { href: '/app/profile', label: 'Profil', match: (path: string) => path.startsWith('/app/profile') || path.startsWith('/app/settings') },
];

export function PhoneShell({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="phone-app">
      <div className="phone-frame">
        <header className="phone-top">
          <div className="phone-who">
            <Link href="/app" className="phone-brand">
              Vora
            </Link>
            <p className="phone-hello">{name}</p>
          </div>
          <nav className="phone-tools" aria-label="Kısayollar">
            <Link href="/" className="home-jump">
              Anasayfa
            </Link>
            <Link href="/app/notifications">Bildirimler</Link>
            <Link href="/app/centers">Merkezler</Link>
            <Link href="/app/settings">Ayarlar</Link>
          </nav>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Çıkış yap
            </button>
          </form>
        </header>
        <div className="phone-body">{children}</div>
        <nav className="phone-tabs" aria-label="Ana sekmeler">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className={`${tab.match(path) ? 'active' : ''} ${tab.create ? 'create' : ''}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
