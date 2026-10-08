'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function contentType(path: string): string {
  if (path.startsWith('/city/')) return 'city';
  if (path.startsWith('/p/')) return 'public_post';
  if (path.startsWith('/blog/')) return 'blog';
  if (path.startsWith('/u/')) return 'profile';
  if (path.startsWith('/events/')) return 'event';
  return 'page';
}

export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const type = contentType(pathname);
    const event =
      type === 'city'
        ? 'city_view'
        : type === 'public_post'
          ? 'public_post_view'
          : type === 'blog'
            ? 'blog_view'
            : type === 'profile'
              ? 'profile_view'
              : type === 'event'
                ? 'event_view'
                : 'web_page_view';
    const city = pathname.startsWith('/city/') ? pathname.split('/')[2] : undefined;
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, path: pathname, contentType: type, citySlug: city, contentId: pathname.split('/').pop() }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
