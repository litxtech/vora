import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeCanlarPost, formatCanlarWhen } from '@/features/vora-canlar/services/contentKind';

test('kampanya bağlantısı gönderiyi bağış olarak ayırır', () => {
  assert.equal(describeCanlarPost({ campaign_id: 'c1', case_id: 'a1', urgency: 'critical' }).kind, 'campaign');
});

test('acil paylaşım vaka paylaşımından önce gelir', () => {
  assert.equal(describeCanlarPost({ case_id: 'a1', urgency: 'urgent' }).label, 'Acil yardım');
});

test('bağlantısız paylaşım topluluk gönderisidir', () => {
  assert.equal(describeCanlarPost({}).kind, 'community');
});

test('bozuk tarih gösterilmez', () => {
  assert.equal(formatCanlarWhen('not-a-date'), null);
  assert.equal(formatCanlarWhen(null), null);
});
