import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignProgress, rescueBadge } from '@/features/vora-canlar/services/presentation';

test('kayıp can ile süren tedavi aynı rozete düşmez', () => {
  assert.equal(rescueBadge({ status: 'lost' }).memorial, true);
  assert.equal(rescueBadge({ status: 'treatment', treatment: 'ongoing' }).label, 'Tedavi sürüyor');
  assert.notEqual(rescueBadge({ status: 'lost' }).label, rescueBadge({ treatment: 'ongoing', status: 'treatment' }).label);
});

test('acil açık vaka tedavi rozetinin önüne geçmez', () => {
  assert.equal(rescueBadge({ status: 'treatment', treatment: 'ongoing', urgency: 'critical' }).label, 'Tedavi sürüyor');
});

test('bağış oranı yalnızca gerçek tutarlardan çıkar', () => {
  assert.equal(campaignProgress(2500, 10000)?.percent, 25);
  assert.equal(campaignProgress(null, 10000), null);
  assert.equal(campaignProgress(100, 0), null);
});
