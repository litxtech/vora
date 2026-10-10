/** Paylaşım linklerinden uygulama route'u çıkarır (vora.app veya Supabase share-preview). */
export function resolveSharePath(path: string): string | null {
  let normalized = path.replace(/^\/+/, '');

  normalized = normalized.replace(/^functions\/v1\/share-preview\/?/, '');

  const queryIndex = normalized.indexOf('?');
  const pathPart = queryIndex >= 0 ? normalized.slice(0, queryIndex) : normalized;
  const query = queryIndex >= 0 ? normalized.slice(queryIndex + 1) : '';

  const match = pathPart.match(/^(p|r|v|u|m|s|c)\/([^/?#]+)/);
  if (!match) {
    const canlar = pathPart.match(/^vora-canlar\/post\/([^/?#]+)/);
    if (!canlar) return null;
    return `/vora-canlar/post/${decodeURIComponent(canlar[1])}${query ? `?${query}` : ''}`;
  }

  const [, kind, id] = match;
  const decoded = decodeURIComponent(id);
  const querySuffix = query ? `?${query}` : '';

  switch (kind) {
    case 'p':
      return `/p/${decoded}${querySuffix}`;
    case 'r':
      return `/r/${decoded}${querySuffix}`;
    case 'v':
      return `/v/${decoded}${querySuffix}`;
    case 'u':
      return `/u/${decoded}${querySuffix}`;
    case 'm':
      return `/detail/marketplace/${decoded}${querySuffix}`;
    case 's':
      return `/business-center/shop/${decoded}${querySuffix}`;
    case 'c':
      return `/vora-canlar/post/${decoded}${querySuffix}`;
    default:
      return null;
  }
}
