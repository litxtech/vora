import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  LEGACY_REMEMBER_USERNAME_KEY,
  MAX_SAVED_LOGIN_ACCOUNTS,
  SAVED_LOGIN_ACCOUNTS_KEY,
} from '@/features/auth/constants/savedLoginAccounts';
import { fetchProfileById, fetchProfileByUsername } from '@/features/profile/services/profileData';
import type {
  SavedLoginAccount,
  SavedLoginAccountInput,
  SavedLoginProfileSnapshot,
} from '@/features/auth/types/savedLoginAccounts';
import { normalizeLoginIdentifierForStorage } from '@/features/auth/services/validation';

const ROUTING_PROFILE_CACHE_KEY = 'auth:routing_profile_v1';

function normalizeLoginId(loginId: string): string {
  return normalizeLoginIdentifierForStorage(loginId);
}

function sortAccounts(accounts: SavedLoginAccount[]): SavedLoginAccount[] {
  return [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

function normalizeStoredAccount(item: Partial<SavedLoginAccount>): SavedLoginAccount | null {
  if (!item || typeof item.loginId !== 'string' || typeof item.lastUsedAt !== 'number') {
    return null;
  }
  return {
    loginId: item.loginId,
    userId: typeof item.userId === 'string' ? item.userId : null,
    displayUsername: item.displayUsername?.trim() || null,
    avatarUrl: item.avatarUrl ?? null,
    lastUsedAt: item.lastUsedAt,
  };
}

async function readRawAccounts(): Promise<SavedLoginAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(SAVED_LOGIN_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<SavedLoginAccount>[];
    if (!Array.isArray(parsed)) return [];
    return sortAccounts(
      parsed
        .map((item) => normalizeStoredAccount(item))
        .filter((item): item is SavedLoginAccount => item !== null),
    );
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: SavedLoginAccount[]): Promise<void> {
  const trimmed = sortAccounts(accounts).slice(0, MAX_SAVED_LOGIN_ACCOUNTS);
  if (trimmed.length === 0) {
    await SecureStore.deleteItemAsync(SAVED_LOGIN_ACCOUNTS_KEY);
    return;
  }
  await SecureStore.setItemAsync(SAVED_LOGIN_ACCOUNTS_KEY, JSON.stringify(trimmed));
}

async function migrateLegacyRememberedUsername(): Promise<SavedLoginAccount[]> {
  const existing = await readRawAccounts();
  if (existing.length > 0) return existing;

  try {
    const legacy = await SecureStore.getItemAsync(LEGACY_REMEMBER_USERNAME_KEY);
    if (!legacy) return [];

    const account: SavedLoginAccount = {
      loginId: normalizeLoginId(legacy),
      userId: null,
      displayUsername: null,
      avatarUrl: null,
      lastUsedAt: Date.now(),
    };
    await writeAccounts([account]);
    await SecureStore.deleteItemAsync(LEGACY_REMEMBER_USERNAME_KEY);
    return [account];
  } catch {
    return [];
  }
}

function mergeAccount(
  existing: SavedLoginAccount | undefined,
  input: SavedLoginAccountInput,
): SavedLoginAccount {
  const loginId = normalizeLoginId(input.loginId);
  return {
    loginId,
    userId: input.userId ?? existing?.userId ?? null,
    displayUsername: input.displayUsername?.trim() || existing?.displayUsername || null,
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl ?? null,
    lastUsedAt: Date.now(),
  };
}

function findAccountIndex(accounts: SavedLoginAccount[], input: SavedLoginAccountInput): number {
  const loginId = normalizeLoginId(input.loginId);
  const userId = input.userId ?? null;
  return accounts.findIndex(
    (item) =>
      item.loginId === loginId ||
      (userId !== null && item.userId === userId) ||
      (input.displayUsername &&
        item.displayUsername &&
        item.displayUsername.toLowerCase() === input.displayUsername.trim().toLowerCase()),
  );
}

async function resolveProfileFromCaches(
  userId: string,
): Promise<Pick<SavedLoginAccount, 'displayUsername' | 'avatarUrl'> | null> {
  try {
    const raw = await AsyncStorage.getItem(ROUTING_PROFILE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        id?: string;
        username?: string | null;
        avatar_url?: string | null;
      };
      if (parsed.id === userId) {
        return {
          displayUsername: parsed.username?.trim() || null,
          avatarUrl: parsed.avatar_url ?? null,
        };
      }
    }
  } catch {
    // fall through
  }

  try {
    const { readOwnProfileDiskCache } = await import('@/features/profile/services/profileDiskCache');
    const disk = await readOwnProfileDiskCache(userId);
    if (disk?.bundle.profile) {
      return {
        displayUsername: disk.bundle.profile.username?.trim() || null,
        avatarUrl: disk.bundle.profile.avatarUrl ?? null,
      };
    }
  } catch {
    // fall through
  }

  return null;
}

export async function enrichSavedLoginAccounts(
  accounts: SavedLoginAccount[],
): Promise<SavedLoginAccount[]> {
  const enriched = await Promise.all(
    accounts.map(async (account) => {
      if (account.avatarUrl && account.displayUsername && account.userId) {
        return account;
      }

      let profile = account.userId ? await fetchProfileById(account.userId) : null;
      if (!profile && account.displayUsername) {
        profile = await fetchProfileByUsername(account.displayUsername);
      }

      if (!profile) return account;

      return {
        ...account,
        userId: profile.id,
        displayUsername: profile.username,
        avatarUrl: profile.avatarUrl,
      };
    }),
  );

  const changed = enriched.some(
    (account, index) =>
      account.avatarUrl !== accounts[index]?.avatarUrl ||
      account.displayUsername !== accounts[index]?.displayUsername ||
      account.userId !== accounts[index]?.userId,
  );

  if (changed) {
    await writeAccounts(enriched);
  }

  return enriched;
}

export async function loadSavedLoginAccounts(): Promise<SavedLoginAccount[]> {
  const accounts = await readRawAccounts();
  const base = accounts.length > 0 ? accounts : await migrateLegacyRememberedUsername();
  return enrichSavedLoginAccounts(base);
}

export async function rememberLoginAccount(input: SavedLoginAccountInput): Promise<SavedLoginAccount[]> {
  const accounts = await readRawAccounts();
  const index = findAccountIndex(accounts, input);
  const existing = index >= 0 ? accounts[index] : undefined;
  const next = mergeAccount(existing, input);
  const withoutCurrent = accounts.filter((_, itemIndex) => itemIndex !== index);
  const merged = sortAccounts([next, ...withoutCurrent]).slice(0, MAX_SAVED_LOGIN_ACCOUNTS);
  await writeAccounts(merged);
  return merged;
}

export async function forgetLoginAccount(loginId: string): Promise<SavedLoginAccount[]> {
  const normalized = normalizeLoginId(loginId);
  const accounts = await readRawAccounts();
  const next = accounts.filter((item) => item.loginId !== normalized);
  await writeAccounts(next);
  return next;
}

export async function syncSavedLoginAccountFromProfile(
  snapshot: SavedLoginProfileSnapshot,
): Promise<SavedLoginAccount[]> {
  const loginIds = [...new Set(snapshot.loginIds.map((item) => normalizeLoginId(item)).filter(Boolean))];
  if (loginIds.length === 0) return readRawAccounts();

  const accounts = await readRawAccounts();
  const index = accounts.findIndex(
    (item) =>
      item.userId === snapshot.userId ||
      loginIds.includes(item.loginId) ||
      (snapshot.username &&
        item.displayUsername &&
        item.displayUsername.toLowerCase() === snapshot.username.toLowerCase()),
  );

  const existing = index >= 0 ? accounts[index] : undefined;
  const primaryLoginId = existing?.loginId ?? loginIds[0]!;
  const next = mergeAccount(existing, {
    loginId: primaryLoginId,
    userId: snapshot.userId,
    displayUsername: snapshot.username,
    avatarUrl: snapshot.avatarUrl,
  });

  const withoutCurrent = accounts.filter((_, itemIndex) => itemIndex !== index);
  const merged = sortAccounts([next, ...withoutCurrent]).slice(0, MAX_SAVED_LOGIN_ACCOUNTS);
  await writeAccounts(merged);
  return merged;
}

export async function resolveSavedLoginAccountProfile(
  userId: string,
): Promise<Pick<SavedLoginAccount, 'displayUsername' | 'avatarUrl' | 'userId'>> {
  const cached = await resolveProfileFromCaches(userId);
  if (cached?.avatarUrl) {
    return { userId, ...cached };
  }

  const profile = await fetchProfileById(userId);
  if (profile) {
    return {
      userId: profile.id,
      displayUsername: profile.username,
      avatarUrl: profile.avatarUrl,
    };
  }

  return {
    userId,
    displayUsername: cached?.displayUsername ?? null,
    avatarUrl: cached?.avatarUrl ?? null,
  };
}

export async function rememberLoginAccountAfterSuccess(
  loginId: string,
  userId: string,
): Promise<SavedLoginAccount[]> {
  const profile = await resolveSavedLoginAccountProfile(userId);
  return rememberLoginAccount({
    loginId,
    userId: profile.userId,
    displayUsername: profile.displayUsername,
    avatarUrl: profile.avatarUrl,
  });
}
