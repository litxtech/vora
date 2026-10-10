import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizePhone,
  prepareContactEntries,
  prepareMatchPhones,
  prepareNamedContactEntries,
} from '@/features/contact-discovery/services/normalizePhone';

test('keeps the phone book formatting separate from E.164', () => {
  const [entry] = prepareContactEntries(['0532 123 45 67'], 'TR');
  assert.equal(entry?.raw, '0532 123 45 67');
  assert.equal(entry?.e164, '+905321234567');
  assert.equal(entry?.country, 'TR');
});

test('normalizes Turkish numbers in local and international forms', () => {
  const expected = '+905321234567';
  for (const raw of ['0532 123 45 67', '05321234567', '5321234567', '+90 532 123 45 67', '0090 532 123 45 67', '(0532) 123-45-67']) {
    const result = normalizePhone(raw, 'TR');
    assert.equal(result.ok, true, raw);
    if (result.ok) assert.equal(result.e164, expected);
  }
});

test('keeps an international number even when the default country differs', () => {
  const result = normalizePhone('+44 20 7946 0958', 'TR');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.e164, '+442079460958');
    assert.equal(result.country, 'GB');
  }
});

test('interprets a local number with the given country', () => {
  const unitedKingdom = normalizePhone('020 7946 0958', 'GB');
  const turkey = normalizePhone('020 7946 0958', 'TR');
  assert.equal(unitedKingdom.ok, true);
  assert.equal(turkey.ok, true);
  if (unitedKingdom.ok) assert.equal(unitedKingdom.e164, '+442079460958');
  if (turkey.ok) assert.equal(turkey.e164, '+902079460958');
});

test('separates empty and invalid numbers without returning the raw value', () => {
  assert.deepEqual(normalizePhone('   ', 'TR'), { ok: false, reason: 'empty' });
  assert.deepEqual(normalizePhone('not a phone', 'TR'), { ok: false, reason: 'invalid' });
  assert.deepEqual(normalizePhone('123', 'TR'), { ok: false, reason: 'invalid' });
  const invalid = normalizePhone('abc123', 'TR');
  assert.equal('e164' in invalid, false);
});

test('deduplicates different writings of the same number', () => {
  const prepared = prepareMatchPhones(
    ['0532 123 45 67', '+90 532 123 45 67', '00905321234567', 'not-a-number', '', '12345'],
    'TR',
  );
  assert.deepEqual(prepared.phones, ['+905321234567']);
  assert.equal(prepared.invalidCount, 2);
});

test('keeps the contact name beside each stored phone', () => {
  const prepared = prepareNamedContactEntries(
    [
      { name: 'Ayşe Yılmaz', phones: ['0532 123 45 67', '0532 123 45 67'] },
      { name: '  ', phones: ['not-a-number'] },
    ],
    'TR',
  );
  assert.equal(prepared.length, 2);
  assert.equal(prepared[0]?.name, 'Ayşe Yılmaz');
  assert.equal(prepared[0]?.e164, '+905321234567');
  assert.equal(prepared[1]?.name, null);
  assert.equal(prepared[1]?.raw, 'not-a-number');
});
