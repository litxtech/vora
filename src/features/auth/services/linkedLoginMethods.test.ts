import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildLinkedProviderRows,
  canUnlinkIdentity,
  verifiedLoginLabels,
} from '@/features/auth/services/linkedLoginMethods';

const google = {
  identityId: 'google-1',
  provider: 'google',
  email: 'ada@gmail.com',
  identityData: { email: 'ada@gmail.com', name: 'Ada Lovelace' },
};

test('yalnızca Google ile kayıtlı hesap bağlantıyı kesemez', () => {
  assert.equal(canUnlinkIdentity(google.identityId, [google], {}), false);
  const [row] = buildLinkedProviderRows(['google', 'x'], [google], {});
  assert.equal(row?.linked, true);
  assert.equal(row?.detail, 'ada@gmail.com');
  assert.equal(row?.canUnlink, false);
  assert.deepEqual(verifiedLoginLabels([google], {}), ['Google']);
});

test('doğrulanmış e-posta varken sosyal hesap kaldırılabilir', () => {
  const email = { identityId: 'email-1', provider: 'email', email: 'ada@firma.com' };
  const context = { emailConfirmedAt: '2026-01-01T00:00:00Z' };
  assert.equal(canUnlinkIdentity(google.identityId, [google, email], context), true);
  assert.equal(canUnlinkIdentity(email.identityId, [google, email], context), true);
  assert.deepEqual(verifiedLoginLabels([google, email], context), ['Google', 'E-posta']);
});

test('onaysız e-posta tek başına sosyal hesabı korumaz', () => {
  const email = { identityId: 'email-1', provider: 'email', email: 'ada@firma.com' };
  assert.equal(canUnlinkIdentity(google.identityId, [google, email], {}), false);
});

test('X satırı eski twitter kimliğini bağlı gösterir', () => {
  const twitter = {
    identityId: 'twitter-1',
    provider: 'twitter',
    identityData: { preferred_username: 'ada' },
  };
  const rows = buildLinkedProviderRows(['x', 'twitch'], [twitter], {});
  assert.equal(rows[0]?.linked, true);
  assert.equal(rows[0]?.detail, '@ada');
  assert.equal(rows[1]?.linked, false);
});

test('iki sosyal hesap varken her biri kaldırılabilir', () => {
  const twitch = { identityId: 'twitch-1', provider: 'twitch', identityData: { name: 'Ninja' } };
  assert.equal(canUnlinkIdentity(google.identityId, [google, twitch], {}), true);
  assert.equal(canUnlinkIdentity(twitch.identityId, [google, twitch], {}), true);
});
