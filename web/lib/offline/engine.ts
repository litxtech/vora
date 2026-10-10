import { idbAll, idbDelete, idbGet, idbPut } from '@/lib/offline/db';
import {
  ACTION_PRIORITY,
  AUTO_TARGET_BYTES,
  BUDGET,
  CACHE_NAMES,
  type ActionType,
  type ContentKind,
  type NetworkStatus,
  type PinLevel,
  automaticCap,
  MAX_RETRY,
  backoffMs,
  classifyPath,
  conflictCopy,
  feedOverflow,
  formatBytes,
  formatClock,
  formatUpdated,
  queueDecision,
  redactSecrets,
  selectEvictions,
  storyVisible,
  stripSecrets,
} from '@/lib/offline/policy';

export { formatBytes, formatClock, formatUpdated, storyVisible, conflictCopy };

type RecordRow = {
  id: string;
  kind: ContentKind | 'story';
  title: string;
  href: string;
  text: string;
  userScope: string;
  updatedAt: number;
  lastAccessedAt: number;
  lastViewedAt: number;
  pin: PinLevel;
  bytes: number;
  expiresAt: number | null;
  deleted?: boolean;
  visibility?: string;
  ownerId?: string | null;
};

type QueueStatus = 'pending' | 'syncing' | 'confirmed' | 'failed';

export type QueueRow = {
  id: string;
  type: ActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: QueueStatus;
  priority: number;
  userScope: string;
  bytes: number;
  checksum?: string;
  uploadOffset: number;
  nextAttemptAt: number;
  lastError?: string;
  permanent?: boolean;
};

type BlobRow = { id: string; blob: Blob; checksum: string; bytes: number };

export type OfflineSnapshot = {
  status: NetworkStatus;
  usageBytes: number;
  quotaBytes: number | null;
  autoTarget: number;
  structuredBytes: number;
  mediaBytes: number;
  videoBytes: number;
  queueBytes: number;
  manualBytes: number;
  pendingCount: number;
  lastSyncAt: number | null;
  lowStorage: boolean;
  persisted: boolean;
  userId: string | null;
  message: string;
};

type SearchHit = { href: string; title: string; kind: string; offline: true };

const listeners = new Set<(snapshot: OfflineSnapshot) => void>();
let snapshot: OfflineSnapshot = {
  status: 'ONLINE',
  usageBytes: 0,
  quotaBytes: null,
  autoTarget: AUTO_TARGET_BYTES,
  structuredBytes: 0,
  mediaBytes: 0,
  videoBytes: 0,
  queueBytes: 0,
  manualBytes: 0,
  pendingCount: 0,
  lastSyncAt: null,
  lowStorage: false,
  persisted: false,
  userId: null,
  message: '',
};
let started = false;
let syncing = false;
let syncTimer = 0;

function emit(patch: Partial<OfflineSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener(snapshot);
}

export function getSnapshot(): OfflineSnapshot {
  return snapshot;
}

export function subscribe(listener: (next: OfflineSnapshot) => void): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

function scope(): string {
  return snapshot.userId ?? 'public';
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function swMessage(message: Record<string, unknown>) {
  navigator.serviceWorker?.controller?.postMessage(message);
}

export function startOfflineEngine(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  emit({ status: navigator.onLine ? 'ONLINE' : 'OFFLINE', message: navigator.onLine ? '' : 'Çevrimdışısın' });
  window.addEventListener('online', () => {
    emit({ status: 'RECONNECTING', message: 'Bağlantı yeniden sağlandı' });
    void refreshIdentity().then(() => syncSoon());
  });
  window.addEventListener('offline', () => emit({ status: 'OFFLINE', message: 'Çevrimdışısın' }));
  const notify = () => {
    const run = () => void recordCurrentPage();
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 400);
  };
  window.addEventListener('pageshow', notify);
  window.addEventListener('popstate', notify);
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (...args) => {
    push(...args);
    notify();
  };
  history.replaceState = (...args) => {
    replace(...args);
    notify();
  };
  void boot();
}

async function boot() {
  try {
    await registerWorker();
  } catch {
    // Service worker desteklenmiyorsa sayfa normal çalışır.
  }
  const idle = async () => {
    await refreshIdentity();
    const last = await idbGet<{ key: string; at: number }>('meta', 'lastSync').catch(() => undefined);
    if (last?.at) emit({ lastSyncAt: last.at });
    await measureStorage();
    await recordCurrentPage();
    await trimCaches();
    if (navigator.onLine) syncSoon();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => void idle(), { timeout: 2000 });
  else setTimeout(() => void idle(), 600);
}

async function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'activated') emit({ message: 'Vora güncellendi' });
    });
  });
}

async function refreshIdentity() {
  let userId = snapshot.userId;
  if (navigator.onLine) {
    try {
      const response = await fetch('/api/offline/whoami', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) {
        const body = (await response.json()) as { userId?: string | null };
        userId = typeof body.userId === 'string' ? body.userId : null;
      }
    } catch {
      userId = snapshot.userId;
    }
  } else {
    const stored = await idbGet<{ key: string; userId: string | null }>('meta', 'activeUser').catch(() => undefined);
    userId = stored?.userId ?? null;
  }
  const previous = await idbGet<{ key: string; userId: string | null }>('meta', 'activeUser').catch(() => undefined);
  if (previous?.userId && previous.userId !== userId) {
    await purgeUser(previous.userId);
    swMessage({ type: 'CLEAR_PRIVATE' });
  }
  await idbPut('meta', { key: 'activeUser', userId }).catch(() => undefined);
  emit({ userId });
}

async function purgeUser(userId: string) {
  const records = await idbAll<RecordRow>('records').catch(() => []);
  const queue = await idbAll<QueueRow>('queue').catch(() => []);
  await Promise.all([
    ...records.filter((row) => row.userScope === userId).map((row) => idbDelete('records', row.id)),
    ...queue.filter((row) => row.userScope === userId).map((row) => idbDelete('queue', row.id).then(() => idbDelete('blobs', row.id))),
  ]);
}

async function measureStorage() {
  let usage = 0;
  let quota: number | null = null;
  let persisted = false;
  try {
    if (navigator.storage?.persist) {
      const already = (await navigator.storage.persisted?.()) ?? false;
      persisted = already || (await navigator.storage.persist());
    }
    const estimate = await navigator.storage?.estimate?.();
    usage = estimate?.usage ?? 0;
    quota = estimate?.quota ?? null;
    const plan = automaticCap(estimate ?? null);
    const [imageBytes, videoBytes] = await Promise.all([
      sumCache(CACHE_NAMES.images),
      sumCache(CACHE_NAMES.video),
    ]);
    emit({
      usageBytes: usage,
      quotaBytes: quota,
      autoTarget: plan.autoBytes,
      lowStorage: plan.low,
      persisted,
      mediaBytes: imageBytes,
      videoBytes,
      message: plan.low ? 'Çevrimdışı içerikler cihazında fazla yer kaplıyor.' : snapshot.message,
    });
    if (plan.low) await trimCaches();
  } catch {
    emit({ usageBytes: usage, quotaBytes: quota, persisted });
  }
}

export async function recordCurrentPage(): Promise<void> {
  if (typeof document === 'undefined') return;
  const path = location.pathname;
  if (/^\/(admin|login|register|reset-password|forgot-password)(\/|$)/.test(path)) return;
  const kind = classifyPath(path);
  const main = document.querySelector('main');
  const text = redactSecrets((main?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 8000));
  const title = redactSecrets(document.title.replace(/\s+·\s+Vora$/, '').trim() || path);
  const now = Date.now();
  const row: RecordRow = {
    id: `page:${path}`,
    kind,
    title,
    href: path + location.search,
    text,
    userScope: scope(),
    updatedAt: now,
    lastAccessedAt: now,
    lastViewedAt: now,
    pin: 'none',
    bytes: text.length * 2 + title.length * 2,
    expiresAt: null,
  };
  const existing = await idbGet<RecordRow>('records', row.id).catch(() => undefined);
  if (existing?.pin) row.pin = existing.pin;
  if (existing?.userScope === scope()) row.bytes = Math.max(row.bytes, existing.bytes);
  await idbPut('records', row).catch(() => undefined);
  if (kind === 'feed') await rememberFeedLinks(now);
  await trimCaches();
  await recount();
}

async function rememberFeedLinks(now: number) {
  const hrefs = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/p/"]')]
    .map((anchor) => anchor.getAttribute('href') ?? '')
    .filter((href, index, all) => href.startsWith('/p/') && all.indexOf(href) === index)
    .slice(0, 50);
  for (const href of hrefs) {
    const title = redactSecrets((document.querySelector(`a[href="${href}"]`)?.textContent ?? href).replace(/\s+/g, ' ').trim().slice(0, 180));
    await idbPut('records', {
      id: `feed:${href}`,
      kind: 'feed',
      title,
      href,
      text: title,
      userScope: scope(),
      updatedAt: now,
      lastAccessedAt: now,
      lastViewedAt: now,
      pin: 'none',
      bytes: title.length * 2,
      expiresAt: null,
    } satisfies RecordRow).catch(() => undefined);
  }
  const feeds = (await idbAll<RecordRow>('records').catch(() => []))
    .filter((row) => row.kind === 'feed' && row.pin === 'none')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  for (const stale of feedOverflow(feeds.map((row) => row.id))) {
    await idbDelete('records', stale);
  }
}

export async function pinCurrent(kind: ContentKind, title: string, href: string): Promise<string> {
  const records = await idbAll<RecordRow>('records').catch(() => []);
  const manualBytes = records.filter((row) => row.pin === 'manual').reduce((sum, row) => sum + row.bytes, 0);
  const existing = records.find((row) => row.href === href);
  const bytes = existing?.bytes ?? Math.max(1024, title.length * 2);
  const cap = Math.min(BUDGET.manual, snapshot.quotaBytes ? Math.floor(snapshot.quotaBytes * 0.4) : BUDGET.manual);
  if (manualBytes + bytes > cap && existing?.pin !== 'manual') {
    return 'Manuel çevrimdışı kayıt için yeterli kota yok.';
  }
  const now = Date.now();
  await idbPut('records', {
    id: existing?.id ?? `page:${href}`,
    kind,
    title,
    href,
    text: existing?.text ?? title,
    userScope: scope(),
    updatedAt: now,
    lastAccessedAt: now,
    lastViewedAt: now,
    pin: 'manual',
    bytes,
    expiresAt: null,
  } satisfies RecordRow);
  await recount();
  return 'Çevrimdışı kaydedildi';
}

export async function searchLocal(query: string): Promise<SearchHit[]> {
  const needle = query.trim().toLocaleLowerCase('tr');
  if (!needle) return [];
  const now = Date.now();
  const rows = await idbAll<RecordRow>('records').catch(() => []);
  return rows
    .filter((row) => {
      if (row.kind === 'story' && !storyVisible({ expiresAt: row.expiresAt, deleted: row.deleted, visibility: row.visibility, ownerId: row.ownerId, viewerId: snapshot.userId }, now).show) {
        return false;
      }
      if (row.userScope !== 'public' && row.userScope !== scope()) return false;
      const hay = `${row.title} ${row.text} ${row.href}`.toLocaleLowerCase('tr');
      return hay.includes(needle);
    })
    .slice(0, 30)
    .map((row) => ({ href: row.href, title: row.title, kind: row.kind, offline: true as const }));
}

export async function lookupPage(path: string): Promise<RecordRow | null> {
  const row = await idbGet<RecordRow>('records', `page:${path}`).catch(() => undefined);
  if (!row) return null;
  if (row.userScope !== 'public' && row.userScope !== scope()) return null;
  row.lastAccessedAt = Date.now();
  await idbPut('records', row).catch(() => undefined);
  return row;
}

async function sumCache(name: string): Promise<number> {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    let total = 0;
    for (const key of keys) {
      const response = await cache.match(key);
      const header = Number(response?.headers.get('content-length') || 0);
      total += Number.isFinite(header) ? header : 0;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function enqueueAction(input: {
  type: ActionType;
  payload: Record<string, unknown>;
  file?: Blob;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!snapshot.userId) await refreshIdentity();
  const userId = snapshot.userId;
  if (!userId) return { ok: false, message: 'Bu işlem için giriş yapmalısın.' };
  const payload = stripSecrets(input.payload);
  const nonce = typeof payload.clientNonce === 'string' ? payload.clientNonce : crypto.randomUUID();
  payload.clientNonce = nonce;
  const id = stableId(input.type, userId, payload);
  const fileBytes = input.file?.size ?? 0;
  const bytes = fileBytes + JSON.stringify(payload).length;
  const queue = await idbAll<QueueRow>('queue').catch(() => []);
  const used = queue.filter((row) => row.status !== 'confirmed').reduce((sum, row) => sum + row.bytes, 0);
  const kind = input.type === 'video' ? 'video' : input.type === 'photo' ? 'photo' : 'text';
  const decision = queueDecision(used, bytes, kind);
  if (!decision.ok) return { ok: false, message: decision.message };
  let checksum: string | undefined;
  if (input.file) {
    checksum = await sha256Hex(input.file);
    const stored = await idbPut('blobs', { id, blob: input.file, checksum, bytes: input.file.size } satisfies BlobRow).then(() => true).catch(() => false);
    if (!stored) return { ok: false, message: 'Dosya cihaza yazılamadı.' };
  }
  const row: QueueRow = {
    id,
    type: input.type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: 'pending',
    priority: ACTION_PRIORITY[input.type],
    userScope: userId,
    bytes,
    checksum,
    uploadOffset: 0,
    nextAttemptAt: Date.now(),
  };
  const queued = await idbPut('queue', row).then(() => true).catch(() => false);
  if (!queued) return { ok: false, message: 'İşlem cihaza yazılamadı.' };
  await recount();
  if (navigator.onLine) syncSoon();
  return { ok: true, message: decision.message, id };
}

function stableId(type: ActionType, userId: string, payload: Record<string, unknown>): string {
  const postId = typeof payload.postId === 'string' ? payload.postId : '';
  if (type === 'like' || type === 'unlike' || type === 'save' || type === 'unsave') return `${type}:${userId}:${postId}`;
  return `${type}:${userId}:${String(payload.clientNonce)}`;
}

export async function listQueue(): Promise<QueueRow[]> {
  const rows = await idbAll<QueueRow>('queue').catch(() => []);
  return rows
    .filter((row) => row.userScope === scope() && row.status !== 'confirmed')
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
}

export async function retryFailed(): Promise<void> {
  const rows = await idbAll<QueueRow>('queue').catch(() => []);
  for (const row of rows) {
    if (row.userScope !== scope() || row.status !== 'failed') continue;
    row.status = 'pending';
    row.permanent = false;
    row.retryCount = 0;
    row.nextAttemptAt = Date.now();
    await idbPut('queue', row);
  }
  syncSoon();
}

export async function clearAutomatic(scopeName: 'video' | 'image' | 'feed' | 'all'): Promise<void> {
  const rows = await idbAll<RecordRow>('records').catch(() => []);
  for (const row of rows) {
    if (row.pin === 'manual') continue;
    const drop =
      scopeName === 'all' ||
      (scopeName === 'feed' && row.kind === 'feed') ||
      (scopeName === 'image' && row.kind === 'post') ||
      (scopeName === 'video' && row.kind === 'story');
    if (drop && (scopeName === 'all' || scopeName === 'feed')) await idbDelete('records', row.id);
  }
  if (scopeName === 'feed') {
    swMessage({ type: 'DELETE_URL', url: '/posts' });
    swMessage({ type: 'DELETE_URL', url: '/' });
  } else {
    swMessage({ type: scopeName === 'all' ? 'CLEAR_AUTO' : scopeName === 'video' ? 'CLEAR_VIDEO' : 'CLEAR_IMAGES' });
  }
  await measureStorage();
  await recount();
}

async function recount() {
  const records = await idbAll<RecordRow>('records').catch(() => []);
  const queue = await idbAll<QueueRow>('queue').catch(() => []);
  const mine = records.filter((row) => row.userScope === 'public' || row.userScope === scope());
  const structuredBytes = mine.filter((row) => row.pin !== 'manual').reduce((sum, row) => sum + row.bytes, 0);
  const manualBytes = mine.filter((row) => row.pin === 'manual').reduce((sum, row) => sum + row.bytes, 0);
  const open = queue.filter((row) => row.userScope === scope() && row.status !== 'confirmed');
  emit({
    structuredBytes,
    manualBytes,
    queueBytes: open.reduce((sum, row) => sum + row.bytes, 0),
    pendingCount: open.length,
  });
}

async function trimCaches() {
  const records = await idbAll<RecordRow>('records').catch(() => []);
  const plan = automaticCap(
    snapshot.quotaBytes ? { quota: snapshot.quotaBytes, usage: snapshot.usageBytes } : null,
  );
  const auto = records.filter((row) => row.pin !== 'manual');
  const used = auto.reduce((sum, row) => sum + row.bytes, 0);
  const over = Math.max(0, used - Math.min(BUDGET.structured, plan.autoBytes));
  for (const row of selectEvictions(auto, over, true)) {
    if (row.kind === 'feed' || row.pin !== 'manual') await idbDelete('records', row.id);
  }
  const manual = records.filter((row) => row.pin === 'manual');
  const manualOver = manual.reduce((sum, row) => sum + row.bytes, 0) - BUDGET.manual;
  for (const row of selectEvictions(manual, manualOver, false)) await idbDelete('records', row.id);
  if (plan.low) swMessage({ type: 'CLEAR_VIDEO' });
}

function syncSoon() {
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => void runSync(), 350);
}

async function runSync() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  emit({ status: 'SYNCING', message: 'Veriler senkronize ediliyor' });
  let error = false;
  try {
    const rows = (await idbAll<QueueRow>('queue')).filter((row) => row.userScope === scope() && (row.status === 'pending' || row.status === 'syncing'));
    rows.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
    const now = Date.now();
    let nextWait = 0;
    for (const row of rows) {
      if (!navigator.onLine) {
        emit({ status: 'OFFLINE', message: 'Çevrimdışısın' });
        return;
      }
      if (row.nextAttemptAt > now) {
        nextWait = nextWait === 0 ? row.nextAttemptAt - now : Math.min(nextWait, row.nextAttemptAt - now);
        continue;
      }
      row.status = 'syncing';
      await idbPut('queue', row);
      const result = await sendRow(row);
      if (result.status === 'confirmed') {
        row.status = 'confirmed';
        row.lastError = undefined;
        row.uploadOffset = row.bytes;
        await idbPut('queue', row);
        await idbDelete('blobs', row.id);
      } else if (result.permanent) {
        row.status = 'failed';
        row.permanent = true;
        row.lastError = result.message || conflictCopy();
        await idbPut('queue', row);
        error = true;
      } else {
        row.retryCount += 1;
        row.lastError = result.message;
        if (row.retryCount > MAX_RETRY) {
          row.status = 'failed';
          row.permanent = true;
          error = true;
        } else {
          row.status = 'pending';
          row.nextAttemptAt = Date.now() + backoffMs(row.retryCount);
          nextWait = nextWait === 0 ? backoffMs(row.retryCount) : Math.min(nextWait, backoffMs(row.retryCount));
        }
        await idbPut('queue', row);
      }
    }
    const stamp = Date.now();
    await idbPut('meta', { key: 'lastSync', at: stamp });
    await refreshVisited();
    await recount();
    if (error) emit({ status: 'SYNC_ERROR', message: 'Bazı işlemler tamamlanamadı', lastSyncAt: stamp });
    else {
      emit({ status: 'SYNC_COMPLETE', message: 'Vora güncel', lastSyncAt: stamp });
      window.setTimeout(() => {
        if (navigator.onLine && snapshot.status === 'SYNC_COMPLETE') emit({ status: 'ONLINE', message: '' });
      }, 3200);
    }
    if (nextWait > 0) {
      window.setTimeout(() => syncSoon(), nextWait + 50);
    }
  } catch {
    emit({ status: 'SYNC_ERROR', message: 'Bazı işlemler tamamlanamadı' });
  } finally {
    syncing = false;
  }
}

async function sendRow(row: QueueRow): Promise<{ status: 'confirmed' | 'retry'; message?: string; permanent?: boolean }> {
  try {
    if (row.type === 'photo' || row.type === 'video') {
      const stored = await idbGet<BlobRow>('blobs', row.id);
      if (!stored?.blob) return { status: 'retry', message: 'Yerel dosya bulunamadı.', permanent: true };
      const body = new FormData();
      body.set('id', row.id);
      body.set('type', row.type);
      body.set('checksum', row.checksum ?? stored.checksum);
      body.set('content', String(row.payload.content ?? ''));
      body.set('regionId', String(row.payload.regionId ?? ''));
      body.set('audience', String(row.payload.audience ?? 'public'));
      body.set('uploadOffset', String(row.uploadOffset ?? 0));
      body.set('file', stored.blob, typeof row.payload.filename === 'string' ? row.payload.filename : 'upload');
      const response = await fetch('/api/offline/media', { method: 'POST', body, credentials: 'same-origin' });
      return readResult(response);
    }
    const response = await fetch('/api/offline/replay', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: row.id, type: row.type, payload: row.payload }),
    });
    return readResult(response);
  } catch {
    return { status: 'retry', message: 'Bağlantı sırasında gönderilemedi.' };
  }
}

async function readResult(response: Response): Promise<{ status: 'confirmed' | 'retry'; message?: string; permanent?: boolean }> {
  const body = (await response.json().catch(() => ({}))) as { status?: string; message?: string; permanent?: boolean };
  if (body.status === 'confirmed') return { status: 'confirmed', message: body.message };
  if (body.permanent || response.status === 409 || response.status === 404) {
    return { status: 'retry', message: body.message || conflictCopy(), permanent: true };
  }
  return { status: 'retry', message: body.message || 'Tekrar denenecek.' };
}

async function refreshVisited() {
  const rows = (await idbAll<RecordRow>('records').catch(() => []))
    .filter((row) => row.userScope === scope() || row.userScope === 'public')
    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    .slice(0, 8);
  for (const row of rows) {
    try {
      const response = await fetch(row.href, { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 404) {
        await idbDelete('records', row.id);
        swMessage({ type: 'DELETE_URL', url: row.href });
      }
    } catch {
      break;
    }
  }
}

export async function pendingForPost(postId: string): Promise<QueueRow[]> {
  const rows = await listQueue();
  return rows.filter((row) => row.payload.postId === postId && (row.type === 'comment' || row.type === 'like' || row.type === 'save'));
}
