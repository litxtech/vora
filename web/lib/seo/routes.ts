import { CITIES } from '@/lib/cities';
import { FEATURES } from '@/lib/features';
import { TOPICS } from '@/lib/topics';

export const STATIC_PAGES: { path: string; index: boolean }[] = [
  { path: '/', index: true },
  { path: '/about', index: true },
  { path: '/features', index: true },
  { path: '/cities', index: true },
  { path: '/explore', index: true },
  { path: '/discover', index: true },
  { path: '/people', index: true },
  { path: '/posts', index: true },
  { path: '/blog', index: true },
  { path: '/events', index: true },
  { path: '/topics', index: true },
  { path: '/city-leaders', index: true },
  { path: '/download', index: true },
  { path: '/help', index: true },
  { path: '/contact', index: true },
  { path: '/privacy', index: true },
  { path: '/terms', index: true },
  { path: '/community-rules', index: true },
  { path: '/child-safety', index: true },
  { path: '/account-deletion', index: true },
  { path: '/search', index: false },
];

export function editorialPaths(): string[] {
  const paths = [
    ...STATIC_PAGES.filter((page) => page.index).map((page) => page.path),
    ...FEATURES.map((feature) => `/features/${feature.slug}`),
    ...CITIES.map((city) => `/city/${city.id}`),
    ...CITIES.flatMap((city) => city.topics.map((topic) => `/city/${city.id}/${topic.slug}`)),
    ...TOPICS.map((topic) => `/topics/${topic.slug}`),
  ];
  return [...new Set(paths)];
}
