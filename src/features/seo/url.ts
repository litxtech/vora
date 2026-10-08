import { FACET_SEO, TRACKING_PARAMS } from '@/features/seo/constants';

export type NormalizedUrl = {
  path: string;
  search: string;
  page: number;
  changed: boolean;
  blockedFacet: boolean;
};

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Trailing slash, büyük harf, çift slash, izleme parametreleri ve tekrarlı query. */
export function normalizeUrl(input: URL): NormalizedUrl {
  const decoded = decodePath(input.pathname);
  let path = decoded.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  path = path
    .split('/')
    .map((part) => part.toLocaleLowerCase('tr'))
    .join('/');
  if (!path.startsWith('/')) path = `/${path}`;

  const params = new URLSearchParams();
  const seen = new Set<string>();
  let stripped = false;
  for (const [key, value] of input.searchParams.entries()) {
    const name = key.toLowerCase();
    if ((TRACKING_PARAMS as readonly string[]).includes(name)) {
      stripped = true;
      continue;
    }
    if (seen.has(name)) {
      stripped = true;
      continue;
    }
    seen.add(name);
    params.append(name, value);
  }
  params.sort();

  const pageRaw = params.get(FACET_SEO.pagination);
  const page = pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1;
  if (page <= 1) params.delete(FACET_SEO.pagination);

  const blockedFacet = FACET_SEO.block.some((key) => params.has(key));
  const search = params.toString();
  const originalSearch = new URLSearchParams(input.search);
  originalSearch.forEach(() => undefined);
  const changed =
    path !== input.pathname ||
    stripped ||
    (page <= 1 && input.searchParams.has('page')) ||
    search !== sortedSearch(input);

  return { path, search, page, changed, blockedFacet };
}

function sortedSearch(input: URL): string {
  const params = new URLSearchParams();
  const seen = new Set<string>();
  for (const [key, value] of input.searchParams.entries()) {
    const name = key.toLowerCase();
    if ((TRACKING_PARAMS as readonly string[]).includes(name) || seen.has(name)) continue;
    seen.add(name);
    params.append(name, value);
  }
  if ((params.get('page') ?? '1') === '1') params.delete('page');
  params.sort();
  return params.toString();
}

export function buildLocation(path: string, search: string): string {
  return search ? `${path}?${search}` : path;
}
