import assert from 'node:assert/strict';
import test from 'node:test';
import { applyExclusions } from './sitemapRules';

test('çıkarılan adres sitemap dosyasına girmez', () => {
  const rows = applyExclusions(
    [
      { path: '/about' },
      { path: '/blog/yeni-yazi' },
    ],
    new Set(['/blog/yeni-yazi']),
  );
  assert.deepEqual(
    rows.map((row) => row.path),
    ['/about'],
  );
});
