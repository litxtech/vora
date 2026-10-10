'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChat, IconCompass, IconFeed, IconPerson, IconPlay, IconPlus } from '@/components/app-icons';

export type AppTab = {
  href: string;
  label: string;
  icon: 'feed' | 'discover' | 'reels' | 'create' | 'messages' | 'profile';
  match: (path: string) => boolean;
};

const ICONS = {
  feed: IconFeed,
  discover: IconCompass,
  reels: IconPlay,
  create: IconPlus,
  messages: IconChat,
  profile: IconPerson,
};

export const PUBLIC_TABS: AppTab[] = [
  { href: '/', label: 'Akış', icon: 'feed', match: (path) => path === '/' || path === '/posts' || path.startsWith('/p/') },
  { href: '/explore', label: 'Keşfet', icon: 'discover', match: (path) => path.startsWith('/explore') || path.startsWith('/discover') || path.startsWith('/search') },
  { href: '/app/reels', label: 'Reels', icon: 'reels', match: (path) => path.startsWith('/app/reels') },
  { href: '/app/compose', label: 'Paylaş', icon: 'create', match: (path) => path.startsWith('/app/compose') },
  { href: '/app/messages', label: 'Mesaj', icon: 'messages', match: (path) => path.startsWith('/app/messages') },
  { href: '/app', label: 'Profil', icon: 'profile', match: (path) => path === '/app' || path.startsWith('/app/profile') || path.startsWith('/u/') || path.startsWith('/login') },
];

export const PHONE_TABS: AppTab[] = [
  { href: '/app', label: 'Akış', icon: 'feed', match: (path) => path === '/app' },
  { href: '/app/explore', label: 'Keşfet', icon: 'discover', match: (path) => path.startsWith('/app/explore') },
  { href: '/app/reels', label: 'Reels', icon: 'reels', match: (path) => path.startsWith('/app/reels') },
  { href: '/app/compose', label: 'Paylaş', icon: 'create', match: (path) => path.startsWith('/app/compose') },
  { href: '/app/messages', label: 'Mesaj', icon: 'messages', match: (path) => path.startsWith('/app/messages') },
  { href: '/app/profile', label: 'Profil', icon: 'profile', match: (path) => path.startsWith('/app/profile') || path.startsWith('/app/settings') },
];

export function AppTabBar({ tabs }: { tabs: AppTab[] }) {
  const path = usePathname() || '/';
  return (
    <nav className="app-tabs" aria-label="Ana sekmeler">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.icon];
        const active = tab.match(path);
        return (
          <Link key={tab.href} href={tab.href} className={`${active ? 'active' : ''} ${tab.icon === 'create' ? 'create' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon />
            {tab.icon === 'create' ? <span className="sr-only">{tab.label}</span> : <span>{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
