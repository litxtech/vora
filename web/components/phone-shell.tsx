'use client';

import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';
import { IconBell } from '@/components/app-icons';
import { AppTabBar, PHONE_TABS } from '@/components/app-tabs';

export function PhoneShell({ name, children }: { name: string; children: React.ReactNode }) {
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
            <Link href="/app/notifications" aria-label="Bildirimler">
              <IconBell size={22} />
            </Link>
            <Link href="/app/settings" aria-label="Ayarlar">
              Ayarlar
            </Link>
          </nav>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Çıkış
            </button>
          </form>
        </header>
        <div className="phone-body">{children}</div>
        <AppTabBar tabs={PHONE_TABS} />
      </div>
    </div>
  );
}
