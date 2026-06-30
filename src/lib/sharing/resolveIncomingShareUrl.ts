import { resolveSharePath } from '@/lib/sharing/resolveSharePath';

function isDevOrMetroLaunch(raw: string): boolean {
  return (
    raw.includes('expo-development-client') ||
    raw.includes('exp+') ||
    /https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?/.test(raw)
  );
}

/** vora://, vora.app, share-preview veya s/id gibi girdilerden paylaşım path'i çıkarır. */
export function extractShareLinkPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isDevOrMetroLaunch(trimmed)) return null;

  if (trimmed.startsWith('vora://')) {
    const path = trimmed.replace(/^vora:\/\//, '').replace(/^\/+/, '');
    return path || null;
  }

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === 'vora.app' || url.hostname === `www.${'vora.app'}`) {
        const path = url.pathname.replace(/^\/+/, '') + url.search;
        return path || null;
      }
      if (url.hostname.includes('supabase.co') && url.pathname.includes('share-preview')) {
        const path = url.pathname.replace(/^.*\/share-preview\/?/, '').replace(/^\/+/, '');
        if (path) return path + url.search;
        const kind = url.searchParams.get('kind') ?? url.searchParams.get('type');
        const id = url.searchParams.get('id');
        if (kind && id && /^[prvums]$/.test(kind)) {
          return `${kind}/${id}${url.search}`;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  if (/^exp(s)?\+?:\/\//.test(trimmed)) {
    const deepLink = trimmed.match(/exps?:\/\/.*?\/--\/(.*)/)?.[1];
    return deepLink?.replace(/^\/+/, '') ?? null;
  }

  const bare = trimmed.replace(/^\/+/, '');
  if (bare.includes('://')) return null;
  if (/^(p|r|v|u|m|s)\//.test(bare)) return bare;
  return null;
}

/** Harici paylaşım URL'sini uygulama içi expo-router path'ine çevirir. */
export function resolveAppRouteFromShareUrl(raw: string): string | null {
  const segment = extractShareLinkPath(raw);
  if (!segment) return null;

  const resolved = resolveSharePath(segment);
  if (resolved) return resolved;

  if (segment.startsWith('business-center/')) {
    return `/${segment}`;
  }

  return null;
}
