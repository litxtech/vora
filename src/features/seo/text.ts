const TR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  İ: 'i',
  I: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

export function slugify(input: string, fallback = 'icerik'): string {
  const mapped = input.trim().replace(/[çğıöşüÇĞİÖŞÜI]/g, (char) => TR_MAP[char] ?? char);
  const slug = mapped
    .toLocaleLowerCase('tr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || fallback;
}

export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toLowerCase();
}

export function contentPath(prefix: string, label: string, id: string, fallback: string): string {
  return `${prefix}/${slugify(label, fallback)}-${shortId(id)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[.,;:\s]+$/g, '')}…`;
}

export function wordCount(parts: string[]): number {
  const text = parts.join(' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function excerpt(value: string, max = 180): string {
  return truncate(stripHtml(value), max);
}

export function normalizeForCompare(value: string): string {
  return value.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

export function readableText(value: string): boolean {
  const letters = value.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g);
  return (letters?.length ?? 0) >= 40;
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+90|0)?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/;

export function containsSensitiveContact(value: string): boolean {
  return EMAIL.test(value) || PHONE.test(value);
}

export function spamSignals(value: string): string[] {
  const reasons: string[] = [];
  const text = value.trim();
  if (!text) return ['empty'];
  if (/(.)\1{7,}/u.test(text)) reasons.push('repeated_characters');
  const urls = text.match(/https?:\/\/|www\./gi);
  if ((urls?.length ?? 0) >= 3) reasons.push('url_density');
  const words = text.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top / words.length > 0.45) reasons.push('repeated_words');
  }
  const letters = text.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  if (letters.length > 40 && letters === letters.toLocaleUpperCase('tr') && letters !== letters.toLocaleLowerCase('tr')) {
    reasons.push('shouting');
  }
  const hashes = text.match(/#\S+/g);
  if ((hashes?.length ?? 0) >= 8 && words.length < 20) reasons.push('hashtag_dump');
  return reasons;
}

export function hashtagsIn(value: string): string[] {
  const found = value.match(/#([\p{L}\p{N}_]{2,40})/gu) ?? [];
  const unique = new Set<string>();
  for (const tag of found) unique.add(slugify(tag.slice(1), ''));
  return [...unique].filter(Boolean);
}

export function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
