import type { MetadataRoute } from 'next';
import { absoluteUrl, isIndexableDeployment } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/search', '/api/', '/login', '/register', '/messages', '/settings', '/wallet'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
