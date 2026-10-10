export type SitemapEntry = {
  path: string;
  lastmod?: string | null;
};

export function applyExclusions(entries: SitemapEntry[], excluded: Set<string>): SitemapEntry[] {
  return entries.filter((entry) => !excluded.has(entry.path));
}
