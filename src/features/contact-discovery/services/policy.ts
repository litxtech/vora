import {
  CONTACT_UPLOAD_BATCH,
  MATCH_BATCH_LIMIT,
  MATCH_DAILY_LIMIT,
  E164_PATTERN,
} from '@/features/contact-discovery/constants';
import type {
  ContactsAccessStep,
  ContactsPermissionSnapshot,
  ContactsPlatform,
  MatchPlan,
} from '@/features/contact-discovery/types';

/**
 * Uygulama açılışı, kayıt ve giriş bu özelliği kendiliğinden başlatmaz.
 * Okuma ve sistem izni yalnızca kullanıcı eşleştirme düğmesine bastığında çalışır.
 */
export const CONTACTS_ACCESS_ON_LAUNCH = {
  requestPermission: false,
  readContacts: false,
} as const;

export function decideContactsAccess(
  platform: ContactsPlatform,
  snapshot: ContactsPermissionSnapshot | null,
): ContactsAccessStep {
  if (platform !== 'ios' && platform !== 'android') return { type: 'unavailable' };
  if (!snapshot) return { type: 'unavailable' };

  if (snapshot.status === 'granted') {
    if (snapshot.accessPrivileges === 'limited') return { type: 'read', scope: 'limited' };
    if (snapshot.accessPrivileges === 'none') {
      return platform === 'ios' ? { type: 'choose-contacts' } : { type: 'open-settings' };
    }
    return { type: 'read', scope: 'all' };
  }

  if (snapshot.status === 'undetermined' || snapshot.canAskAgain) {
    return { type: 'request-system' };
  }

  return { type: 'open-settings' };
}

export function planMatchBatches(phones: readonly string[], alreadyUsedToday = 0): MatchPlan {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const phone of phones) {
    if (!E164_PATTERN.test(phone) || seen.has(phone)) continue;
    seen.add(phone);
    unique.push(phone);
  }

  if (unique.length === 0) return { ok: false, reason: 'empty' };

  const remaining = MATCH_DAILY_LIMIT - Math.max(0, alreadyUsedToday);
  if (remaining <= 0) return { ok: false, reason: 'daily-limit' };

  const accepted = unique.slice(0, remaining);
  const batches: string[][] = [];
  for (let index = 0; index < accepted.length; index += MATCH_BATCH_LIMIT) {
    batches.push(accepted.slice(index, index + MATCH_BATCH_LIMIT));
  }

  return {
    ok: true,
    batches,
    omitted: unique.length - accepted.length,
  };
}

export function chunkList<T>(items: readonly T[], size = CONTACT_UPLOAD_BATCH): T[][] {
  if (size <= 0) return [];
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export function assertAuthenticatedMatch(input: {
  userId: string | null;
  isGuest: boolean;
}): string | null {
  if (!input.userId || input.isGuest) {
    return 'Rehber eşleştirme için aktif bir hesapla giriş yapman gerekir.';
  }
  return null;
}

export function friendshipLabel(input: {
  isFriend: boolean;
  viewerFollows: boolean;
  followsViewer: boolean;
}): string {
  if (input.isFriend) return 'Arkadaşsınız';
  if (input.viewerFollows) return 'Takiptesin';
  if (input.followsViewer) return 'Seni takip ediyor';
  return 'Henüz bağlantınız yok';
}

export function mergeMatches<T extends { userId: string }>(groups: readonly T[][]): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    for (const match of group) {
      if (!byId.has(match.userId)) byId.set(match.userId, match);
    }
  }
  return [...byId.values()];
}
