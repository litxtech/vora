import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { CountryCode } from 'libphonenumber-js';
import { prepareContactEntries } from '@/features/contact-discovery/services/normalizePhone';
import type { ContactBookUpload } from '@/features/contact-discovery/services/normalizePhone';

export type DeviceContact = {
  id: string;
  name: string;
  phones: string[];
};
import type { ContactsPermissionSnapshot, ContactsPlatform } from '@/features/contact-discovery/types';

type ContactsModule = typeof import('expo-contacts');

let contactsModule: ContactsModule | null | undefined;

/** Eski geliştirme derlemesinde ExpoContactsNext yoktur. Paketi yüklemek hata basar. */
function loadContactsModule(): ContactsModule | null {
  if (contactsModule !== undefined) return contactsModule;
  if (!requireOptionalNativeModule('ExpoContactsNext')) {
    contactsModule = null;
    return null;
  }
  try {
    contactsModule = require('expo-contacts') as ContactsModule;
    return contactsModule;
  } catch {
    contactsModule = null;
    return null;
  }
}

export function isContactsNativeReady(): boolean {
  return loadContactsModule() != null;
}

const PAGE_SIZE = 400;

export function currentContactsPlatform(): ContactsPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') return Platform.OS;
  return 'other';
}

function toSnapshot(response: {
  status: string;
  canAskAgain?: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none' | null;
}): ContactsPermissionSnapshot {
  const status = response.status === 'granted' || response.status === 'denied' ? response.status : 'undetermined';
  return {
    status,
    canAskAgain: response.canAskAgain !== false,
    accessPrivileges: response.accessPrivileges ?? null,
  };
}

export async function readContactsPermission(): Promise<ContactsPermissionSnapshot | null> {
  const contacts = loadContactsModule();
  if (!contacts || currentContactsPlatform() === 'web' || currentContactsPlatform() === 'other') return null;
  try {
    return toSnapshot(await contacts.getPermissionsAsync());
  } catch {
    return null;
  }
}

/** Yalnızca kullanıcı eşleştirmeyi başlattığında çağrılır. */
export async function requestContactsPermission(): Promise<ContactsPermissionSnapshot | null> {
  const contacts = loadContactsModule();
  if (!contacts || currentContactsPlatform() === 'web' || currentContactsPlatform() === 'other') return null;
  try {
    return toSnapshot(await contacts.requestPermissionsAsync());
  } catch {
    return null;
  }
}

export async function presentLimitedContactPicker(): Promise<boolean> {
  const contacts = loadContactsModule();
  if (!contacts || Platform.OS !== 'ios') return false;
  try {
    await contacts.Contact.presentAccessPicker();
    return true;
  } catch {
    return false;
  }
}

type RawDeviceContact = {
  id?: string;
  fullName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  phones?: { number?: string | null }[] | null;
};

function deviceContactName(contact: RawDeviceContact): string {
  const full = contact.fullName?.trim();
  if (full) return full;
  const joined = [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim();
  return joined || 'İsimsiz';
}

async function readContactPages(
  contacts: NonNullable<ReturnType<typeof loadContactsModule>>,
  fields: readonly (typeof import('expo-contacts').ContactField)[keyof typeof import('expo-contacts').ContactField][],
): Promise<DeviceContact[]> {
  const people: DeviceContact[] = [];
  let offset = 0;

  for (;;) {
    const page = (await contacts.Contact.getAllDetails(fields, {
      limit: PAGE_SIZE,
      offset,
    })) as RawDeviceContact[];

    for (const contact of page) {
      const phones = (contact.phones ?? [])
        .map((phone) => phone.number?.trim() ?? '')
        .filter((number) => number.length > 0);
      const name = deviceContactName(contact);
      people.push({
        id: contact.id?.trim() || `${name}:${phones[0] ?? people.length}`,
        name,
        phones,
      });
    }

    if (page.length < PAGE_SIZE) break;
    offset += page.length;
    if (offset >= 20000) break;
  }

  return people;
}

/** Telefondaki her kişiyi adıyla okur. Uygulamada olmayanlar da dahildir. */
export async function readDeviceContacts(): Promise<DeviceContact[] | null> {
  const contacts = loadContactsModule();
  if (!contacts || currentContactsPlatform() === 'web' || currentContactsPlatform() === 'other') return null;

  const fieldSets = [
    [
      contacts.ContactField.FULL_NAME,
      contacts.ContactField.GIVEN_NAME,
      contacts.ContactField.FAMILY_NAME,
      contacts.ContactField.PHONES,
    ],
    [contacts.ContactField.PHONES],
  ];

  for (const fields of fieldSets) {
    try {
      return await readContactPages(contacts, fields);
    } catch {
      // Ad alanları bu derlemede yoksa yalnızca numarayla devam et.
    }
  }

  return null;
}

export async function readContactBookEntries(defaultCountry: CountryCode): Promise<{
  entries: ContactBookUpload[];
  invalidCount: number;
} | null> {
  const people = await readDeviceContacts();
  if (!people) return null;

  const entries = prepareContactEntries(
    people.flatMap((person) => person.phones),
    defaultCountry,
  );
  return {
    entries,
    invalidCount: entries.filter((entry) => entry.e164 === null).length,
  };
}
