import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AUTO_TARGET_BYTES,
  BUDGET,
  CACHE_NAMES,
  CACHE_VERSION,
  MAX_RETRY,
  automaticCap,
  backoffMs,
  classifyPath,
  classifyRequest,
  conflictCopy,
  evictionOrder,
  feedOverflow,
  queueDecision,
  selectEvictions,
  storyVisible,
  stripSecrets,
} from './policy';

test('mutasyonlar önbelleğe yazılmaz', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(classifyRequest(method, 'https://vora.app/api/posts').strategy, 'skip');
  }
});

test('statik varlık cache-first, api stale, harita yok', () => {
  assert.equal(classifyRequest('GET', 'https://vora.app/_next/static/chunk.js').strategy, 'cache-first');
  assert.equal(classifyRequest('GET', 'https://vora.app/rest/v1/regions').strategy, 'stale-while-revalidate');
  assert.equal(classifyRequest('GET', 'https://api.mapbox.com/styles/v1/map').strategy, 'skip');
  assert.equal(classifyRequest('GET', 'https://abc.supabase.co/auth/v1/token').strategy, 'skip');
  assert.equal(classifyRequest('GET', 'https://vora.app/login').strategy, 'skip');
});

test('oturumlu api yanıtı paylaşılan önbelleğe düşmez', () => {
  const decision = classifyRequest('GET', 'https://vora.app/rest/v1/posts', true);
  assert.equal(decision.private, true);
  assert.equal(decision.bucket, 'api');
});

test('gizli alanlar düz metin olarak tutulmaz', () => {
  const clean = stripSecrets({
    content: 'merhaba',
    password: 'gizli',
    refresh_token: 'abc',
    nested: { api_key: 'x', city: 'Trabzon' },
    note: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
  });
  assert.equal(clean.password, undefined);
  assert.equal(clean.refresh_token, undefined);
  assert.equal(clean.nested.api_key, undefined);
  assert.equal(clean.nested.city, 'Trabzon');
  assert.equal(clean.note.includes('eyJ'), false);
});

test('backoff 1s 2s 4s 8s 16s ve deneme sınırı', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(backoffMs), [1000, 2000, 4000, 8000, 16000]);
  assert.equal(MAX_RETRY, 5);
});

test('story süresi ve gizliliği aşılmaz', () => {
  const now = 1_000_000;
  assert.equal(storyVisible({ expiresAt: now - 1, visibility: 'public' }, now).show, false);
  assert.equal(storyVisible({ deleted: true, visibility: 'public' }, now).reason, 'deleted');
  assert.equal(storyVisible({ visibility: 'private', ownerId: 'a', viewerId: 'b' }, now).show, false);
  assert.equal(storyVisible({ visibility: 'private', ownerId: 'a', viewerId: 'a' }, now).show, true);
  assert.equal(storyVisible({ visibility: 'public', expiresAt: now + 1000 }, now).show, true);
});

test('LRU önce eskisini, manuel kaydı en son siler', () => {
  const ordered = evictionOrder([
    { id: 'manual', bytes: 10, lastAccessedAt: 1, pin: 'manual' as const },
    { id: 'old', bytes: 10, lastAccessedAt: 2, pin: 'none' as const },
    { id: 'fav', bytes: 10, lastAccessedAt: 1, pin: 'favorite' as const },
    { id: 'new', bytes: 10, lastAccessedAt: 9, pin: 'none' as const },
  ]);
  assert.deepEqual(ordered.map((row) => row.id), ['old', 'new', 'fav', 'manual']);
  const victims = selectEvictions(ordered, 15, true);
  assert.deepEqual(victims.map((row) => row.id), ['old', 'new']);
});

test('feed 50 kayıtta kalır ve kuyruk 250 MB sınırına uyar', () => {
  const overflow = feedOverflow(Array.from({ length: 55 }, (_, index) => `p${index}`), 50);
  assert.equal(overflow.length, 5);
  const tooBig = queueDecision(0, BUDGET.queue + 1, 'video');
  assert.equal(tooBig.ok, false);
  assert.match(tooBig.message, /250 MB/);
  const queued = queueDecision(0, 1024, 'video');
  assert.equal(queued.ok, true);
  assert.match(queued.message, /bağlantı geldiğinde/);
});

test('düşük depolamada otomatik hedef küçülür, kota yoksa 1 GB hedef kalır', () => {
  assert.equal(automaticCap(null).autoBytes, AUTO_TARGET_BYTES);
  const low = automaticCap({ quota: 300 * 1024 * 1024, usage: 280 * 1024 * 1024 });
  assert.equal(low.low, true);
  assert.ok(low.autoBytes <= 200 * 1024 * 1024);
});

test('yol sınıfları ve çakışma metni', () => {
  assert.equal(classifyPath('/city/trabzon'), 'city');
  assert.equal(classifyPath('/blog/yazi'), 'blog');
  assert.equal(classifyPath('/events/1'), 'event');
  assert.equal(classifyPath('/posts'), 'feed');
  assert.equal(conflictCopy(), 'Bu içerik artık mevcut olmadığı için işlemin tamamlanamadı.');
});

test('service worker sürümü policy ile aynı ve eski önbelleği siler', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/sw.js'), 'utf8');
  assert.match(source, new RegExp(`CACHE_VERSION = '${CACHE_VERSION}'`));
  assert.match(source, /vora-static-\$\{CACHE_VERSION\}/);
  assert.equal(CACHE_NAMES.static, `vora-static-${CACHE_VERSION}`);
  assert.match(source, /request\.method !== 'GET'/);
  assert.match(source, /startsWith\('vora-'\)/);
  assert.match(source, /set-cookie/);
});
