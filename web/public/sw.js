/* Vora offline service worker. Sürüm değişince eski vora-* önbellekleri silinir. */
const CACHE_VERSION = 'v1';
const CACHES_V1 = {
  static: `vora-static-${CACHE_VERSION}`,
  api: `vora-api-${CACHE_VERSION}`,
  apiUser: `vora-api-user-${CACHE_VERSION}`,
  images: `vora-images-${CACHE_VERSION}`,
  video: `vora-video-${CACHE_VERSION}`,
  pages: `vora-pages-${CACHE_VERSION}`,
  pagesUser: `vora-pages-user-${CACHE_VERSION}`,
};
const PRECACHE = ['/offline.html', '/vora-logo.png', '/favicon.ico', '/manifest.webmanifest'];
const LIMITS = { images: 400, video: 30, pages: 60, api: 150, static: 220 };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHES_V1.static).then((cache) =>
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('vora-') && !Object.values(CACHES_V1).includes(key))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (request.headers.has('range')) return;
  if (url.pathname === '/sw.js') return;
  const decision = classify(url, hasSession(request));
  if (decision.strategy === 'skip') return;
  event.respondWith(route(event, decision));
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CLEAR_PRIVATE') {
    event.waitUntil(Promise.all([caches.delete(CACHES_V1.apiUser), caches.delete(CACHES_V1.pagesUser)]));
  } else if (data.type === 'CLEAR_AUTO') {
    event.waitUntil(Promise.all([
      caches.delete(CACHES_V1.api),
      caches.delete(CACHES_V1.apiUser),
      caches.delete(CACHES_V1.images),
      caches.delete(CACHES_V1.video),
      caches.delete(CACHES_V1.pages),
      caches.delete(CACHES_V1.pagesUser),
    ]));
  } else if (data.type === 'CLEAR_VIDEO') {
    event.waitUntil(caches.delete(CACHES_V1.video));
  } else if (data.type === 'CLEAR_IMAGES') {
    event.waitUntil(caches.delete(CACHES_V1.images));
  } else if (data.type === 'DELETE_URL' && typeof data.url === 'string') {
    event.waitUntil(deleteUrl(data.url));
  }
});

function hasSession(request) {
  return /sb-[^=;\s]+-auth-token/.test(request.headers.get('cookie') || '');
}

function classify(url, session) {
  const path = url.pathname;
  const href = url.href;
  if (/password|refresh[_-]?token|access[_-]?token|secret|api[_-]?key|authorization/i.test(href)) {
    return { strategy: 'skip' };
  }
  if (/(^|\.)mapbox\.com$|(^|\.)googleapis\.com$|(^|\.)openstreetmap\.org$|(^|\.)arcgis\.com$/i.test(url.hostname)) {
    return { strategy: 'skip' };
  }
  if (
    path.startsWith('/admin') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/api/offline/') ||
    path.includes('/auth/v1/') ||
    path.includes('/object/sign/') ||
    path.includes('/realtime/v1/')
  ) {
    return { strategy: 'skip' };
  }
  if (/\.(?:mp4|webm|mov|m4v)$/i.test(path)) {
    return { strategy: 'media', cache: session && !path.includes('/object/public/') ? null : CACHES_V1.video, limit: LIMITS.video };
  }
  if (path === '/favicon.ico' || path === '/vora-logo.png' || /\.(?:svg|ico)$/i.test(path)) {
    return { strategy: 'cache-first', cache: CACHES_V1.static, limit: LIMITS.static };
  }
  if (/\.(?:avif|bmp|gif|jpe?g|png|webp)$/i.test(path) || (/\/storage\/v1\/object\/public\//.test(path) && !/\.(?:mp4|webm|mov)$/i.test(path))) {
    return { strategy: 'media', cache: CACHES_V1.images, limit: LIMITS.images };
  }
  if (path === '/offline-boot.js' || path === '/offline.html') {
    return { strategy: 'swr', cache: CACHES_V1.static, limit: LIMITS.static };
  }
  if (
    path.startsWith('/_next/static/') ||
    path.startsWith('/_expo/static/') ||
    path === '/manifest.webmanifest' ||
    /\.(?:css|js|mjs|woff2?|ttf|otf)$/i.test(path)
  ) {
    return { strategy: 'cache-first', cache: CACHES_V1.static, limit: LIMITS.static };
  }
  if (path.startsWith('/rest/v1/') || (path.startsWith('/api/') && !path.startsWith('/api/offline/'))) {
    return { strategy: 'swr', cache: session ? CACHES_V1.apiUser : CACHES_V1.api, limit: LIMITS.api };
  }
  const shell = path === '/vora-app.html' || path.startsWith('/discover') || path.startsWith('/messages') || path.startsWith('/reels');
  if (shell || url.searchParams.has('_rsc')) {
    return { strategy: 'network-first', cache: session ? CACHES_V1.pagesUser : CACHES_V1.pages, limit: LIMITS.pages };
  }
  return { strategy: 'swr', cache: session ? CACHES_V1.pagesUser : CACHES_V1.pages, limit: LIMITS.pages };
}

async function route(event, decision) {
  const request = event.request;
  if (!decision.cache) return fetch(request);
  if (decision.strategy === 'cache-first' || decision.strategy === 'media') return cacheFirst(request, decision);
  if (decision.strategy === 'network-first') return networkFirst(request, decision);
  return staleWhileRevalidate(event, decision);
}

async function cacheFirst(request, decision) {
  const cache = await caches.open(decision.cache);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await putSafe(cache, request, response, decision.limit);
    return response;
  } catch {
    return cached || fallback(request);
  }
}

async function networkFirst(request, decision) {
  const cache = await caches.open(decision.cache);
  try {
    const response = await fetch(request);
    await putSafe(cache, request, response, decision.limit);
    return response;
  } catch {
    return (await cache.match(request)) || fallback(request);
  }
}

async function staleWhileRevalidate(event, decision) {
  const request = event.request;
  const cache = await caches.open(decision.cache);
  const cached = await cache.match(request);
  const refreshing = fetch(request)
    .then((response) => putSafe(cache, request, response, decision.limit).then(() => response))
    .catch(() => null);
  if (cached) {
    event.waitUntil(refreshing.then(() => undefined));
    return cached;
  }
  return (await refreshing) || fallback(request);
}

async function putSafe(cache, request, response, limit) {
  if (!response || response.status !== 200) return;
  try {
    if (response.type === 'opaque') {
      await cache.put(request, response.clone());
    } else if (response.type === 'basic' || response.type === 'cors') {
      const headers = new Headers(response.headers);
      headers.delete('set-cookie');
      headers.delete('set-cookie2');
      const clean = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, clean);
    }
    await trim(cache, limit);
  } catch {
    // Kota doluysa sayfa çalışmaya devam eder.
  }
}

async function trim(cache, limit) {
  if (!limit) return;
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

async function fallback(request) {
  if (request.mode === 'navigate') {
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
  }
  return new Response('Çevrimdışı', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

async function deleteUrl(raw) {
  const url = new URL(raw, self.location.origin).href;
  await Promise.all(Object.values(CACHES_V1).map(async (name) => {
    const cache = await caches.open(name);
    await cache.delete(url);
  }));
}
