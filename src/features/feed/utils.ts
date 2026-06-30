export function formatFeedTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} g`;

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace('.0', '')}B`;
  return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? [...new Set(matches.map((t) => t.slice(1).toLowerCase()))] : [];
}

export function normalizeHashtagTag(raw: string): string {
  try {
    return decodeURIComponent(raw).toLowerCase().replace(/^#/, '').trim();
  } catch {
    return raw.toLowerCase().replace(/^#/, '').trim();
  }
}
