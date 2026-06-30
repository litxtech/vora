import AsyncStorage from '@react-native-async-storage/async-storage';
import { devWarn } from '@/lib/safeLog';
import { normalizeLinkInput } from '@/lib/linking/openUrl';

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const CACHE_KEY = (url: string) => `messaging:link-preview:v1:${url}`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000; // başarısız: 6 saat
const FETCH_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 256 * 1024;

type CacheEntry = {
  savedAt: number;
  preview: LinkPreview | null;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<LinkPreview | null>>();

function isFresh(entry: CacheEntry): boolean {
  const ttl = entry.preview ? CACHE_TTL_MS : NEGATIVE_TTL_MS;
  return Date.now() - entry.savedAt < ttl;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .trim();
}

function clean(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
  return decoded.length > 0 ? decoded.slice(0, 300) : null;
}

/** <meta property|name="key" content="..."> (sıra bağımsız) yakalar. */
function readMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]+(?:property|name)\\s*=\\s*["']${escaped}["']`,
        'i',
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function resolveImageUrl(image: string | null, baseUrl: string): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseHtml(html: string, url: string): LinkPreview {
  const title =
    clean(readMeta(html, ['og:title', 'twitter:title'])) ??
    clean(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null);
  const description = clean(
    readMeta(html, ['og:description', 'twitter:description', 'description']),
  );
  const rawImage = readMeta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
  const siteName = clean(readMeta(html, ['og:site_name', 'application-name']));

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = null;
  }

  return {
    url,
    title,
    description,
    imageUrl: resolveImageUrl(rawImage, url),
    siteName: siteName ?? hostname,
  };
}

function hasMeaningfulData(preview: LinkPreview): boolean {
  return Boolean(preview.title || preview.description || preview.imageUrl);
}

async function readBoundedText(response: Response): Promise<string> {
  const text = await response.text();
  return text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
}

async function fetchFromNetwork(url: string): Promise<LinkPreview | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; VoraBot/1.0; +https://vora.app) facebookexternalhit/1.1',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(contentType)) return null;

    const html = await readBoundedText(response);
    const preview = parseHtml(html, response.url || url);
    return hasMeaningfulData(preview) ? preview : null;
  } catch (error) {
    devWarn('linkPreview', 'fetch failed', { url, error: String(error) });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function readDiskCache(key: string): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeDiskCache(key: string, entry: CacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    devWarn('linkPreview', 'cache write failed', { error: String(error) });
  }
}

/** URL için OG/Twitter önizleme verisini getirir; bellek + disk cache'li. */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  const url = normalizeLinkInput(rawUrl);
  if (!url || !/^https?:\/\//i.test(url)) return null;

  const memory = memoryCache.get(url);
  if (memory && isFresh(memory)) return memory.preview;

  const pending = inflight.get(url);
  if (pending) return pending;

  const task = (async () => {
    const key = CACHE_KEY(url);
    const disk = await readDiskCache(key);
    if (disk && isFresh(disk)) {
      memoryCache.set(url, disk);
      return disk.preview;
    }

    const preview = await fetchFromNetwork(url);
    const entry: CacheEntry = { savedAt: Date.now(), preview };
    memoryCache.set(url, entry);
    void writeDiskCache(key, entry);
    return preview;
  })();

  inflight.set(url, task);
  try {
    return await task;
  } finally {
    inflight.delete(url);
  }
}
