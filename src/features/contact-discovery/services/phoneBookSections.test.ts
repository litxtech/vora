import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPhoneBookGroups,
  buildPhoneBookSections,
  contactSectionLetter,
  PHONE_BOOK_INVITE,
  PHONE_BOOK_ON_APP,
} from '@/features/contact-discovery/services/phoneBookSections';

test('groups Turkish names and keeps people who are not in the app', () => {
  const sections = buildPhoneBookSections([
    { id: '1', name: 'istanbul', phones: ['1'], match: null },
    { id: '2', name: 'Ayşe', phones: ['2'], match: null },
    { id: '3', name: 'ışık', phones: ['3'], match: null },
    { id: '4', name: '123 Servis', phones: [], match: null },
  ]);
  assert.deepEqual(
    sections.map((section) => section.title),
    ['A', 'I', 'İ', '#'],
  );
  assert.equal(contactSectionLetter('istanbul'), 'İ');
  assert.equal(contactSectionLetter('ışık'), 'I');
  assert.equal(sections.find((section) => section.title === 'İ')?.data[0]?.match, null);
  assert.equal(sections[1]?.data[0]?.match, null);
});

test('splits the book into people on Vora and people to invite', () => {
  const match = {
    userId: 'u1',
    username: 'ayse',
    fullName: 'Ayşe',
    avatarUrl: null,
    isVerified: false,
    viewerFollows: false,
    followsViewer: false,
    isFriend: false,
    matchedE164: '+905551112233',
  };
  const sections = buildPhoneBookGroups([
    { id: '1', name: 'Zeynep', phones: ['1'], match: null },
    { id: '2', name: 'Ayşe', phones: ['2'], match },
    { id: '3', name: 'Mehmet', phones: ['3'], match: null },
    { id: '4', name: 'Berk', phones: ['4'], match },
  ]);
  assert.deepEqual(
    sections.map((section) => section.title),
    [PHONE_BOOK_ON_APP, PHONE_BOOK_INVITE],
  );
  assert.deepEqual(
    sections[0]?.data.map((contact) => contact.name),
    ['Ayşe', 'Berk'],
  );
  assert.deepEqual(
    sections[1]?.data.map((contact) => contact.name),
    ['Mehmet', 'Zeynep'],
  );
});
