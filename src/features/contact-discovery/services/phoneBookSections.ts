import type { ContactMatch } from '@/features/contact-discovery/types';

const LETTERS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ',
  'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T',
  'U', 'Ü', 'V', 'Y', 'Z', '#',
];

export type PhoneBookContact = {
  id: string;
  name: string;
  phones: string[];
  match: ContactMatch | null;
};

export type PhoneBookSection = {
  title: string;
  data: PhoneBookContact[];
};

function turkishUpperLetter(char: string): string {
  if (char === 'i' || char === 'İ') return 'İ';
  if (char === 'ı' || char === 'I') return 'I';
  return char.toLocaleUpperCase('tr');
}

export function contactSectionLetter(name: string): string {
  const first = name.trim().charAt(0);
  if (!first) return '#';
  const letter = turkishUpperLetter(first);
  return LETTERS.includes(letter) ? letter : '#';
}

export const PHONE_BOOK_ON_APP = 'Vora’da';
export const PHONE_BOOK_INVITE = 'Davet et';

export function buildPhoneBookGroups(contacts: readonly PhoneBookContact[]): PhoneBookSection[] {
  const onApp: PhoneBookContact[] = [];
  const offApp: PhoneBookContact[] = [];

  for (const contact of contacts) {
    if (contact.match) onApp.push(contact);
    else offApp.push(contact);
  }

  const byName = (left: PhoneBookContact, right: PhoneBookContact) =>
    left.name.localeCompare(right.name, 'tr', { sensitivity: 'base' });

  const sections: PhoneBookSection[] = [];
  if (onApp.length > 0) sections.push({ title: PHONE_BOOK_ON_APP, data: onApp.sort(byName) });
  if (offApp.length > 0) sections.push({ title: PHONE_BOOK_INVITE, data: offApp.sort(byName) });
  return sections;
}

export function phoneBookIndexLetters(contacts: readonly PhoneBookContact[]): string[] {
  const present = new Set(contacts.map((contact) => contactSectionLetter(contact.name)));
  return LETTERS.filter((letter) => present.has(letter));
}

export function buildPhoneBookSections(contacts: readonly PhoneBookContact[]): PhoneBookSection[] {
  const groups = new Map<string, PhoneBookContact[]>();
  const sorted = [...contacts].sort((left, right) =>
    left.name.localeCompare(right.name, 'tr', { sensitivity: 'base' }),
  );

  for (const contact of sorted) {
    const letter = contactSectionLetter(contact.name);
    const bucket = groups.get(letter);
    if (bucket) bucket.push(contact);
    else groups.set(letter, [contact]);
  }

  return LETTERS.filter((letter) => groups.has(letter)).map((title) => ({
    title,
    data: groups.get(title) ?? [],
  }));
}

export function contactMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => turkishUpperLetter(part.charAt(0)));
  return letters.join('') || '#';
}

export function contactSubtitle(contact: PhoneBookContact): string {
  const phone = contact.phones[0];
  if (!phone) return 'Numara yok';
  if (contact.phones.length === 1) return phone;
  return `${phone} · +${contact.phones.length - 1}`;
}
