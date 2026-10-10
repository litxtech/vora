import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureSectionId } from '@/features/feature-flags/buildSubFeatures';
import { CONTACT_DISCOVERY_FEATURE_ID } from '@/features/contact-discovery/constants';
import {
  CONTACTS_ACCESS_ON_LAUNCH,
  assertAuthenticatedMatch,
  decideContactsAccess,
  friendshipLabel,
  mergeMatches,
  planMatchBatches,
} from '@/features/contact-discovery/services/policy';
import { MATCH_BATCH_LIMIT, MATCH_DAILY_LIMIT } from '@/features/contact-discovery/constants';

test('feature id matches settings section id', () => {
  assert.equal(featureSectionId('settings', 'find-friends'), CONTACT_DISCOVERY_FEATURE_ID);
});

test('launch never requests or reads contacts', () => {
  assert.equal(CONTACTS_ACCESS_ON_LAUNCH.requestPermission, false);
  assert.equal(CONTACTS_ACCESS_ON_LAUNCH.readContacts, false);
});

test('first launch asks the system only after the user starts matching', () => {
  assert.deepEqual(
    decideContactsAccess('ios', { status: 'undetermined', canAskAgain: true, accessPrivileges: null }),
    { type: 'request-system' },
  );
  assert.deepEqual(
    decideContactsAccess('android', { status: 'undetermined', canAskAgain: true, accessPrivileges: null }),
    { type: 'request-system' },
  );
});

test('granted access reads contacts, including a limited iOS selection', () => {
  assert.deepEqual(
    decideContactsAccess('android', { status: 'granted', canAskAgain: true, accessPrivileges: null }),
    { type: 'read', scope: 'all' },
  );
  assert.deepEqual(
    decideContactsAccess('ios', { status: 'granted', canAskAgain: false, accessPrivileges: 'limited' }),
    { type: 'read', scope: 'limited' },
  );
});

test('denial does not lock the app and permanent denial opens settings', () => {
  assert.deepEqual(
    decideContactsAccess('android', { status: 'denied', canAskAgain: true, accessPrivileges: null }),
    { type: 'request-system' },
  );
  assert.deepEqual(
    decideContactsAccess('ios', { status: 'denied', canAskAgain: false, accessPrivileges: 'none' }),
    { type: 'open-settings' },
  );
  assert.deepEqual(
    decideContactsAccess('android', { status: 'denied', canAskAgain: false, accessPrivileges: null }),
    { type: 'open-settings' },
  );
});

test('iOS none selection asks the user to choose contacts', () => {
  assert.deepEqual(
    decideContactsAccess('ios', { status: 'granted', canAskAgain: false, accessPrivileges: 'none' }),
    { type: 'choose-contacts' },
  );
});

test('web cannot start a contacts permission flow', () => {
  assert.deepEqual(
    decideContactsAccess('web', { status: 'undetermined', canAskAgain: true, accessPrivileges: null }),
    { type: 'unavailable' },
  );
});

test('reopening the screen still does not read contacts by itself', () => {
  const reopened = decideContactsAccess('ios', {
    status: 'granted',
    canAskAgain: false,
    accessPrivileges: 'all',
  });
  assert.equal(reopened.type, 'read');
  assert.equal(CONTACTS_ACCESS_ON_LAUNCH.readContacts, false);
});

test('bulk queries are capped per batch and per day', () => {
  const phones = Array.from({ length: 2500 }, (_, index) => `+90532${String(1000000 + index).slice(0, 7)}`);
  const plan = planMatchBatches(phones);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.ok(plan.batches.every((batch) => batch.length <= MATCH_BATCH_LIMIT));
  assert.equal(plan.batches.reduce((sum, batch) => sum + batch.length, 0), MATCH_DAILY_LIMIT);
  assert.equal(plan.omitted, 2500 - MATCH_DAILY_LIMIT);
  assert.deepEqual(planMatchBatches(phones, MATCH_DAILY_LIMIT), { ok: false, reason: 'daily-limit' });
});

test('guests and signed-out users cannot match', () => {
  assert.equal(assertAuthenticatedMatch({ userId: null, isGuest: false }) !== null, true);
  assert.equal(assertAuthenticatedMatch({ userId: 'user', isGuest: true }) !== null, true);
  assert.equal(assertAuthenticatedMatch({ userId: 'user', isGuest: false }), null);
});

test('friendship labels and duplicate matches', () => {
  assert.equal(friendshipLabel({ isFriend: true, viewerFollows: true, followsViewer: true }), 'Arkadaşsınız');
  assert.equal(friendshipLabel({ isFriend: false, viewerFollows: true, followsViewer: false }), 'Takiptesin');
  assert.deepEqual(
    mergeMatches([
      [{ userId: 'a' }, { userId: 'b' }],
      [{ userId: 'b' }, { userId: 'c' }],
    ]).map((item) => item.userId),
    ['a', 'b', 'c'],
  );
});
