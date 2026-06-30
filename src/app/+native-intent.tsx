import { extractShareLinkPath } from '@/lib/sharing/resolveIncomingShareUrl';
import { resolveSharePath } from '@/lib/sharing/resolveSharePath';

function isDevOrMetroLaunch(raw: string): boolean {
  return (
    raw.includes('expo-development-client') ||
    raw.includes('exp+') ||
    /https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?/.test(raw)
  );
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
    if (isDevOrMetroLaunch(path)) {
      return '/';
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
