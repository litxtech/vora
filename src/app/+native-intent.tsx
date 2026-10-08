import { extractShareLinkPath } from '@/lib/sharing/resolveIncomingShareUrl';
import { resolveSharePath } from '@/lib/sharing/resolveSharePath';

function isExpoDevClient(raw: string): boolean {
  return raw.includes('expo-development-client') || raw.includes('exp+');
}

/** Web sekme tıklaması tam URL gelir. Path'i koru; kök adres akışta kalsın. */
function pathnameFromHttp(raw: string): string | null {
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return null;
  }
}

function toAppPath(segment: string): string {
  if (!segment) return '/';
  return segment.startsWith('/') ? segment : `/${segment}`;
}

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (isExpoDevClient(path)) {
      return '/';
    }

    const httpPath = pathnameFromHttp(path);
    if (httpPath) {
      const share = extractShareLinkPath(path);
      if (share) {
        const shared = resolveSharePath(share);
        if (shared) return shared;
      }
      if (httpPath === '/vora-app.html' || httpPath === '/index.html') return '/';
      return httpPath;
    }

    const normalized = extractShareLinkPath(path) ?? path.replace(/^\/+/, '');
    const resolved = resolveSharePath(normalized);
    if (resolved) return resolved;

    const candidate = toAppPath(normalized);
    if (candidate.includes('://') || candidate.includes('exp+')) {
      return '/';
    }

    if (initial && candidate === '/') {
      return '/';
    }

    return candidate;
  } catch {
    return '/';
  }
}
