/** Gösterim için URL'yi kısaltır: domain + kısa path (tam ham URL yerine). */
export function formatUrlDisplay(raw: string, maxLen = 42): string {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    const host = parsed.hostname.replace(/^www\./i, '');
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, '');
    if (!path || path === '/') return host;
    const shortPath = path.length > 28 ? `${path.slice(0, 25)}…` : path;
    const full = `${host}${shortPath}`;
    return full.length > maxLen ? `${full.slice(0, maxLen - 1)}…` : full;
  } catch {
    const trimmed = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed;
  }
}

export function hostnameFromUrl(raw: string): string {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, '');
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || raw;
  }
}
