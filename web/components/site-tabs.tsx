'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/posts', label: 'Akış', match: (path: string) => path === '/posts' || path.startsWith('/p/') },
  { href: '/explore', label: 'Keşfet', match: (path: string) => path.startsWith('/explore') || path.startsWith('/discover') },
  { href: '/cities', label: 'Şehir', match: (path: string) => path.startsWith('/cities') || path.startsWith('/city/') },
  { href: '/app/compose', label: 'Paylaş', match: (path: string) => path.startsWith('/app/compose'), create: true },
  { href: '/events', label: 'Etkinlik', match: (path: string) => path.startsWith('/events') },
  { href: '/app', label: 'Profil', match: (path: string) => path.startsWith('/app') || path.startsWith('/login') || path.startsWith('/u/') },
];

export function SiteTabBar() {
  const path = usePathname() || '/';
  if (path.startsWith('/admin') || path.startsWith('/app')) return null;
  return (
    <nav className="site-tabs" aria-label="Ana sekmeler">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={`${tab.match(path) ? 'active' : ''} ${tab.create ? 'create' : ''}`}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
