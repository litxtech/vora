'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { IconBell } from '@/components/app-icons';
import { AppTabBar, PUBLIC_TABS } from '@/components/app-tabs';

export function AppChrome() {
  const path = usePathname() || '/';
  const app = !path.startsWith('/admin') && !path.startsWith('/app');

  useEffect(() => {
    document.body.dataset.chrome = app ? 'app' : 'site';
    return () => {
      document.body.dataset.chrome = 'site';
    };
  }, [app]);

  if (!app) return null;

  return (
    <>
      <header className="app-bar">
        <Link href="/" className="app-brand">
          Vora
        </Link>
        <Link href="/app/notifications" className="app-icon-btn" aria-label="Bildirimler">
          <IconBell />
        </Link>
      </header>
      <AppTabBar tabs={PUBLIC_TABS} />
    </>
  );
}
