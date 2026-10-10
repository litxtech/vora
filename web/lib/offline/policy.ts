/** Saf karar katmanı. Tarayıcı API'si yok; testler burayı doğrular. */

export const CACHE_VERSION = 'v1';

export const CACHE_NAMES = {
  static: `vora-static-${CACHE_VERSION}`,
  api: `vora-api-${CACHE_VERSION}`,
  apiUser: `vora-api-user-${CACHE_VERSION}`,
  images: `vora-images-${CACHE_VERSION}`,
  video: `vora-video-${CACHE_VERSION}`,
  pages: `vora-pages-${CACHE_VERSION}`,
  pagesUser: `vora-pages-user-${CACHE_VERSION}`,
} as const;

export const BYTE = {
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
} as const;

/** Otomatik önbellek hedefi. Tarayıcı kotası bunu garanti etmez. */
export const AUTO_TARGET_BYTES = BYTE.gb;

export const BUDGET = {
  static: 150 * BYTE.mb,
  structured: 100 * BYTE.mb,
  image: 500 * BYTE.mb,
  video: BYTE.gb,
  queue: 250 * BYTE.mb,
  manual: 2 * BYTE.gb,
  auto: AUTO_TARGET_BYTES,
} as const;

export const FEED_KEEP = 50;
export const MAX_RETRY = 5;
export const IMAGE_UPLOAD_LIMIT = 10 * BYTE.mb;

export const ACTION_PRIORITY = {
  metadata: 1,
  like: 2,
  unlike: 2,
  comment: 3,
  save: 4,
  unsave: 4,
  post: 5,
  photo: 6,
  video: 7,
} as const;

export type ActionType = keyof typeof ACTION_PRIORITY;
export type PinLevel = 'none' | 'favorite' | 'manual';
export type NetworkStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'RECONNECTING'
  | 'SYNCING'
  | 'SYNC_COMPLETE'
  | 'SYNC_ERROR';

export type CacheBucket = 'static' | 'api' | 'images' | 'video' | 'pages';
export type CacheStrategy = 'skip' | 'cache-first' | 'stale-while-revalidate' | 'network-first' | 'media';

const SECRET_KEY = /password|passwd|refresh[_-]?token|access[_-]?token|id[_-]?token|secret|api[_-]?key|service[_-]?role|authorization|session|credential/i;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const MAP_HOST = /(^|\.)mapbox\.com$|(^|\.)googleapis\.com$|(^|\.)openstreetmap\.org$|(^|\.)arcgis\.com$/i;

function videoExt(path: string): boolean {
  return /\.(?:mp4|webm|mov|m4v)$/i.test(path);
}

const SKIP_PATH = [
  /^\/admin(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/register(?:\/|$)/,
  /^\/reset-password(?:\/|$)/,
  /^\/forgot-password(?:\/|$)/,
  /^\/api\/offline\/(?:replay|media|whoami)(?:\/|$)/,
  /\/auth\/v1(?:\/|$)/,
  /\/object\/sign\//,
  /\/realtime\/v1(?:\/|$)/,
];

export function backoffMs(retryCount: number): number {
  const exp = Math.min(4, Math.max(0, retryCount - 1));
  return 1000 * 2 ** exp;
}

export function isSensitiveKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

export function redactSecrets(text: string): string {
  return text.replace(JWT, '[redacted]');
}

export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripSecrets(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) continue;
      out[key] = typeof inner === 'string' ? redactSecrets(inner) : stripSecrets(inner);
    }
    return out as T;
  }
  if (typeof value === 'string') return redactSecrets(value) as T;
  return value;
}

export function classifyRequest(
  method: string,
  rawUrl: string,
  hasSession = false,
): { strategy: CacheStrategy; bucket: CacheBucket | null; private: boolean } {
  if (method.toUpperCase() !== 'GET') return { strategy: 'skip', bucket: null, private: false };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { strategy: 'skip', bucket: null, private: false };
  }
  const path = url.pathname;
  if (SECRET_KEY.test(url.href) || MAP_HOST.test(url.hostname)) {
    return { strategy: 'skip', bucket: null, private: false };
  }
  if (SKIP_PATH.some((pattern) => pattern.test(path))) {
    return { strategy: 'skip', bucket: null, private: false };
  }
  if (path === '/sw.js') return { strategy: 'network-first', bucket: null, private: false };
  if (path === '/offline-boot.js' || path === '/offline.html') {
    return { strategy: 'stale-while-revalidate', bucket: 'static', private: false };
  }

  const imageExt = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(path);
  const publicObject = /\/storage\/v1\/object\/public\//.test(path);
  const image = imageExt || (publicObject && !videoExt(path));
  const video = videoExt(path);
  if (video) return { strategy: 'media', bucket: 'video', private: hasSession && !path.includes('/object/public/') };
  if (image || path === '/favicon.ico' || path === '/vora-logo.png') {
    const icon = path === '/favicon.ico' || path === '/vora-logo.png' || path.endsWith('.svg') || path.endsWith('.ico');
    return { strategy: icon ? 'cache-first' : 'media', bucket: icon ? 'static' : 'images', private: false };
  }

  const staticAsset =
    path.startsWith('/_next/static/') ||
    path.startsWith('/_expo/static/') ||
    path === '/manifest.webmanifest' ||
    path === '/offline.html' ||
    /\.(?:css|js|mjs|woff2?|ttf|otf)$/i.test(path);
  if (staticAsset) return { strategy: 'cache-first', bucket: 'static', private: false };

  const api = path.startsWith('/rest/v1/') || path.startsWith('/api/') || path.includes('/storage/v1/object/public/');
  if (api) return { strategy: 'stale-while-revalidate', bucket: 'api', private: hasSession };

  const appShell = path === '/vora-app.html' || path.startsWith('/discover') || path.startsWith('/messages') || path.startsWith('/reels');
  if (appShell || url.searchParams.has('_rsc')) {
    return { strategy: 'network-first', bucket: 'pages', private: hasSession };
  }
  return { strategy: 'stale-while-revalidate', bucket: 'pages', private: hasSession };
}

export type ContentKind = 'feed' | 'post' | 'city' | 'blog' | 'event' | 'profile' | 'explore' | 'page';

export function classifyPath(path: string): ContentKind {
  if (path === '/' || path === '/posts' || path.startsWith('/posts/')) return 'feed';
  if (path.startsWith('/p/')) return 'post';
  if (path.startsWith('/city/')) return 'city';
  if (path.startsWith('/blog/') || path.startsWith('/en/blog/') || path.startsWith('/tr/blog/')) return 'blog';
  if (path.startsWith('/events/')) return 'event';
  if (path.startsWith('/u/')) return 'profile';
  if (path.startsWith('/explore') || path.startsWith('/discover') || path.startsWith('/search')) return 'explore';
  return 'page';
}

export function storyVisible(story: {
  expiresAt?: number | null;
  deleted?: boolean;
  visibility?: string;
  ownerId?: string | null;
  viewerId?: string | null;
}, now = Date.now()): { show: boolean; reason?: string } {
  if (story.deleted) return { show: false, reason: 'deleted' };
  if (story.expiresAt != null && story.expiresAt <= now) return { show: false, reason: 'expired' };
  const visibility = story.visibility ?? 'public';
  if (visibility === 'public') return { show: true };
  if (story.viewerId && story.ownerId && story.viewerId === story.ownerId) return { show: true };
  return { show: false, reason: 'private' };
}

export type Evictable = {
  id: string;
  bytes: number;
  lastAccessedAt: number;
  lastViewedAt?: number;
  pin: PinLevel;
};

const PIN_RANK: Record<PinLevel, number> = { none: 0, favorite: 1, manual: 2 };

export function evictionOrder<T extends Evictable>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const pin = PIN_RANK[a.pin] - PIN_RANK[b.pin];
    if (pin !== 0) return pin;
    const aUse = Math.max(a.lastAccessedAt, a.lastViewedAt ?? 0);
    const bUse = Math.max(b.lastAccessedAt, b.lastViewedAt ?? 0);
    return aUse - bUse;
  });
}

export function selectEvictions<T extends Evictable>(entries: T[], overBytes: number, spareManual = true): T[] {
  if (overBytes <= 0) return [];
  const ordered = evictionOrder(entries).filter((entry) => !(spareManual && entry.pin === 'manual'));
  const picked: T[] = [];
  let freed = 0;
  for (const entry of ordered) {
    if (freed >= overBytes) break;
    picked.push(entry);
    freed += Math.max(1, entry.bytes);
  }
  return picked;
}

export function automaticCap(estimate: { quota?: number; usage?: number } | null): { autoBytes: number; low: boolean } {
  if (!estimate?.quota || estimate.quota <= 0) return { autoBytes: AUTO_TARGET_BYTES, low: false };
  const usage = estimate.usage ?? 0;
  const free = Math.max(0, estimate.quota - usage);
  const low = free < 200 * BYTE.mb || usage / estimate.quota > 0.85;
  if (low) return { autoBytes: Math.min(AUTO_TARGET_BYTES, 200 * BYTE.mb), low: true };
  const respectful = Math.min(AUTO_TARGET_BYTES, Math.floor(free * 0.5));
  return { autoBytes: Math.max(32 * BYTE.mb, respectful), low: false };
}

export function queueDecision(currentBytes: number, incomingBytes: number, kind: 'photo' | 'video' | 'text'): { ok: boolean; message: string } {
  const next = currentBytes + incomingBytes;
  if (incomingBytes > BUDGET.queue || next > BUDGET.queue) {
    return {
      ok: false,
      message: kind === 'video'
        ? 'Bu video bağlantı geldiğinde yüklenmek üzere kaydedilecek kadar yer yok. 250 MB kuyruk sınırı aşıldığı için cihazda tutulmayacak.'
        : 'Çevrimdışı kuyruk doldu (250 MB). Bu işlem cihazda tutulamadı.',
    };
  }
  if (kind === 'video') {
    return { ok: true, message: 'Bu video bağlantı geldiğinde yüklenmek üzere kaydedilecek.' };
  }
  return { ok: true, message: 'İnternet bekleniyor' };
}

export function feedOverflow(idsNewestFirst: string[], keep = FEED_KEEP): string[] {
  return idsNewestFirst.slice(keep);
}

export function conflictCopy(): string {
  return 'Bu içerik artık mevcut olmadığı için işlemin tamamlanamadı.';
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < BYTE.mb) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < BYTE.gb) return `${Math.round(bytes / BYTE.mb)} MB`;
  return `${(bytes / BYTE.gb).toFixed(1)} GB`;
}

export function formatUpdated(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'Son güncelleme: az önce';
  if (minutes < 60) return `Son güncelleme: ${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Son güncelleme: ${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Son güncelleme: dün';
  return `Son güncelleme: ${days} gün önce`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' });
}
