import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  currentContactsPlatform,
  isContactsNativeReady,
  presentLimitedContactPicker,
  readContactsPermission,
  readDeviceContacts,
  requestContactsPermission,
  type DeviceContact,
} from '@/features/contact-discovery/services/contactsAccess';
import { matchDiscoveryPhones, syncContactBook } from '@/features/contact-discovery/services/discoveryApi';
import { defaultCountryFromLocale, normalizePhone, prepareNamedContactEntries } from '@/features/contact-discovery/services/normalizePhone';
import { decideContactsAccess } from '@/features/contact-discovery/services/policy';
import {
  type PhoneBookContact,
} from '@/features/contact-discovery/services/phoneBookSections';
import type { ContactMatch } from '@/features/contact-discovery/types';
import { useAuth } from '@/providers/AuthProvider';

export type PhoneBookPhase = 'checking' | 'needs-permission' | 'denied' | 'unavailable' | 'ready';

const NATIVE_MISSING =
  'Rehber modülü bu uygulama sürümünde yok. Yeni bir geliştirme derlemesi gerekir.';

function attachMatches(
  people: readonly DeviceContact[],
  byPhone: ReadonlyMap<string, ContactMatch>,
  country: ReturnType<typeof defaultCountryFromLocale>,
): PhoneBookContact[] {
  return people.map((person) => {
    let match: ContactMatch | null = null;
    for (const phone of person.phones) {
      const normalized = normalizePhone(phone, country);
      if (!normalized.ok) continue;
      const found = byPhone.get(normalized.e164);
      if (found) {
        match = found;
        break;
      }
    }
    return {
      id: person.id,
      name: person.name,
      phones: person.phones,
      match,
    };
  });
}

export function usePhoneBook() {
  const { user, isGuest } = useAuth();
  const [phase, setPhase] = useState<PhoneBookPhase>('checking');
  const [contacts, setContacts] = useState<PhoneBookContact[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [limited, setLimited] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const publish = useCallback(
    async (people: DeviceContact[]) => {
      const country = defaultCountryFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
      if (!mountedRef.current) return;
      setContacts(attachMatches(people, new Map(), country));
      setPhase('ready');

      const named = prepareNamedContactEntries(people, country);

      if (named.length > 0 && user?.id && !isGuest) {
        const [matched] = await Promise.all([
          matchDiscoveryPhones({
            userId: user.id,
            isGuest,
            entries: named,
          }),
          syncContactBook({
            userId: user.id,
            isGuest,
            entries: named,
          }),
        ]);
        if (!mountedRef.current) return;
        setContacts(attachMatches(people, matched.byPhone, country));
      }

      if (!mountedRef.current) return;
      setNotice(null);
    },
    [isGuest, user?.id],
  );

  const loadGrantedBook = useCallback(
    async (scopeLimited: boolean, quiet: boolean) => {
      setLimited(scopeLimited);
      if (!quiet) setRefreshing(true);
      const people = await readDeviceContacts();
      if (!mountedRef.current) return;
      if (!people) {
        setPhase('unavailable');
        setNotice('Rehber okunamadı. İzni kontrol edip tekrar deneyebilirsin.');
        setRefreshing(false);
        return;
      }
      await publish(people);
      if (mountedRef.current) setRefreshing(false);
    },
    [publish],
  );

  const requestAccess = useCallback(async () => {
    if (!isContactsNativeReady()) {
      setPhase('unavailable');
      setNotice(NATIVE_MISSING);
      return;
    }

    const platform = currentContactsPlatform();
    if (platform === 'web' || platform === 'other') {
      setPhase('unavailable');
      setNotice('Telefon rehberi iOS ve Android uygulamasında açılır.');
      return;
    }

    let snapshot = await readContactsPermission();
    let step = decideContactsAccess(platform, snapshot);

    if (step.type === 'request-system') {
      snapshot = await requestContactsPermission();
      step = decideContactsAccess(platform, snapshot);
    }

    if (step.type === 'choose-contacts') {
      const picked = await presentLimitedContactPicker();
      if (!picked) {
        setPhase('denied');
        setNotice('Kişi seçimi açılamadı. Ayarlardan rehber iznini değiştirebilirsin.');
        return;
      }
      snapshot = await readContactsPermission();
      step = decideContactsAccess(platform, snapshot);
    }

    if (step.type === 'open-settings' || step.type === 'unavailable') {
      setPhase('denied');
      setNotice('Rehber izni kapalı. Kişiler listelenmedi.');
      return;
    }

    if (step.type !== 'read') {
      setPhase('needs-permission');
      setNotice(null);
      return;
    }

    await loadGrantedBook(step.scope === 'limited', false);
  }, [loadGrantedBook]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        if (!isContactsNativeReady()) {
          if (active) {
            setPhase('unavailable');
            setNotice(NATIVE_MISSING);
          }
          return;
        }

        const platform = currentContactsPlatform();
        if (platform === 'web' || platform === 'other') {
          if (active) {
            setPhase('unavailable');
            setNotice('Telefon rehberi iOS ve Android uygulamasında açılır.');
          }
          return;
        }

        const snapshot = await readContactsPermission();
        if (!active) return;
        const step = decideContactsAccess(platform, snapshot);
        if (step.type === 'read') {
          await loadGrantedBook(step.scope === 'limited', true);
          return;
        }
        if (step.type === 'open-settings') {
          setPhase('denied');
          setNotice(null);
          return;
        }
        setPhase('needs-permission');
        setNotice(null);
      };

      void run();
      return () => {
        active = false;
      };
    }, [loadGrantedBook]),
  );

  return {
    phase,
    contacts,
    notice,
    refreshing,
    limited,
    requestAccess,
    openSettings: () => {
      void Linking.openSettings();
    },
    refresh: () => loadGrantedBook(limited, false),
  };
}
