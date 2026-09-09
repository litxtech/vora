import AsyncStorage from '@react-native-async-storage/async-storage';
import { devWarn } from '@/lib/safeLog';
import { normalizeLinkInput } from '@/lib/linking/openUrl';

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  /** Varsa yazar / yayıncı satırı */
  author: string | null;
};

const CACHE_KEY = (url: string) => `richtext:link-preview:v2:${url}`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000; // başarısız: 6 saat
const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 384 * 1024;
const MAX_DESCRIPTION = 420;

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

function clean(value: string | null, maxLen = 300): string | null {
  if (!value) return null;
  const decoded = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
  return decoded.length > 0 ? decoded.slice(0, maxLen) : null;
}

/** <meta property|name="key" content="..."> (sıra bağımsız, tek/çift tırnak). */
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
    if (trimmed.startsWith('data:')) return null;
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

type JsonLdBits = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  author: string | null;
};

function readJsonLd(html: string): JsonLdBits {
  const empty: JsonLdBits = {
    title: null,
    description: null,
    image: null,
    siteName: null,
    author: null,
  };
  const scripts = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      let nodes: unknown[] = [parsed];
      if (Array.isArray(parsed)) {
        nodes = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const graph = (parsed as Record<string, unknown>)['@graph'];
        if (Array.isArray(graph)) nodes = graph;
      }

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const obj = node as Record<string, unknown>;
        const typeRaw = obj['@type'];
        const types = Array.isArray(typeRaw)
          ? typeRaw.map(String)
          : typeRaw
            ? [String(typeRaw)]
            : [];
        const interesting = types.some((t) =>
          /Article|NewsArticle|BlogPosting|WebPage|Product|Organization|WebSite/i.test(t),
        );
        if (!interesting && types.length > 0) continue;

        const headline = typeof obj.headline === 'string' ? obj.headline : null;
        const name = typeof obj.name === 'string' ? obj.name : null;
        const desc = typeof obj.description === 'string' ? obj.description : null;

        let image: string | null = null;
        const img = obj.image;
        if (typeof img === 'string') image = img;
        else if (Array.isArray(img) && typeof img[0] === 'string') image = img[0];
        else if (img && typeof img === 'object') {
          const imgUrl = (img as Record<string, unknown>).url;
          if (typeof imgUrl === 'string') image = imgUrl;
        }

        let author: string | null = null;
        const auth = obj.author;
        if (typeof auth === 'string') author = auth;
        else if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
          const authName = (auth as Record<string, unknown>).name;
          if (typeof authName === 'string') author = authName;
        } else if (Array.isArray(auth) && auth[0] && typeof auth[0] === 'object') {
          const authName = (auth[0] as Record<string, unknown>).name;
          if (typeof authName === 'string') author = authName;
        }

        let siteName: string | null = null;
        const publisher = obj.publisher;
        if (publisher && typeof publisher === 'object') {
          const pubName = (publisher as Record<string, unknown>).name;
          if (typeof pubName === 'string') siteName = pubName;
        }

        return {
          title: headline ?? name,
          description: desc,
          image,
          siteName,
          author,
        };
      }
    } catch {
      // bozuk JSON-LD — sonraki script'e geç
    }
  }

  return empty;
}

/** OG yoksa ilk anlamlı paragrafı site özeti olarak kullanır. */
function readFirstParagraph(html: string): string | null {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  for (const match of withoutScripts.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = clean(match[1].replace(/<[^>]+>/g, ' '), MAX_DESCRIPTION);
    if (text && text.length >= 40) return text;
  }
  return null;
}

function parseHtml(html: string, url: string): LinkPreview {
  const jsonLd = readJsonLd(html);

  const title =
    clean(readMeta(html, ['og:title', 'twitter:title'])) ??
    clean(jsonLd.title) ??
    clean(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null);

  const description =
    clean(
      readMeta(html, ['og:description', 'twitter:description', 'description']),
      MAX_DESCRIPTION,
    ) ??
    clean(jsonLd.description, MAX_DESCRIPTION) ??
    readFirstParagraph(html);

  const rawImage =
    readMeta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) ??
    jsonLd.image;

  const siteName =
    clean(readMeta(html, ['og:site_name', 'application-name'])) ?? clean(jsonLd.siteName);

  const author =
    clean(readMeta(html, ['author', 'article:author', 'twitter:creator'])) ?? clean(jsonLd.author);

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
    author,
  };
}

function hasMeaningfulData(preview: LinkPreview): boolean {
  return Boolean(preview.title || preview.description || preview.imageUrl);
}

async function readBoundedText(response: Response): Promise<string> {
  const text = await response.text();
  return text.length > MAX_HTML_BYTES ? text.slice(0, MAX_HTML_BYTES) : text;
}

function looksLikeHtml(text: string, contentType: string): boolean {
  if (/text\/html|application\/xhtml/i.test(contentType)) return true;
  if (!contentType || /text\/plain|application\/octet-stream/i.test(contentType)) {
    return /<html[\s>]|<head[\s>]|<meta[\s]|og:title|twitter:title/i.test(text.slice(0, 4096));
  }
  return false;
}

const FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchFromNetwork(url: string): Promise<LinkPreview | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return null;

    const html = await readBoundedText(response);
    const contentType = response.headers.get('content-type') ?? '';
    if (!looksLikeHtml(html, contentType)) return null;

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

/** URL için OG/Twitter/JSON-LD önizleme verisini getirir; bellek + disk cache'li. */
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
