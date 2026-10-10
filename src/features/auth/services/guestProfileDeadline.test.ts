import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GUEST_PROFILE_DEADLINE_MS,
  isGuestProfileDeadlineReached,
  needsMandatoryGuestProfileCard,
} from '@/features/auth/services/guestProfileDeadline';

const createdAt = '2026-10-09T17:00:00.000Z';
const before = Date.parse(createdAt) + GUEST_PROFILE_DEADLINE_MS - 1;
const after = Date.parse(createdAt) + GUEST_PROFILE_DEADLINE_MS;

test('24 saat dolmadan kart gerekmez', () => {
  assert.equal(isGuestProfileDeadlineReached(createdAt, before), false);
  assert.equal(
    needsMandatoryGuestProfileCard({
      createdAt,
      guestAccount: true,
      now: before,
    }),
    false,
  );
});

test('24 saat dolunca misafir kartı açık kalır', () => {
  assert.equal(isGuestProfileDeadlineReached(createdAt, after), true);
  assert.equal(
    needsMandatoryGuestProfileCard({
      createdAt,
      guestAccount: true,
      now: after,
    }),
    true,
  );
});

test('misafir olmayan hesapta kart kapalıdır', () => {
  assert.equal(
    needsMandatoryGuestProfileCard({
      createdAt,
      guestAccount: false,
      now: after,
    }),
    false,
  );
});
