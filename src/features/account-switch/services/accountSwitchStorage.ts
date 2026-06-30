import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  ACTING_MODE_STORAGE_KEY,
  LAST_ACTIVE_ACCOUNT_KEY,
  SIBLING_SESSION_PREFIX,
} from '@/features/account-switch/constants';
import type { ActingMode, StoredSiblingSession } from '@/features/account-switch/types';

export type LastActiveAccountState = {
  activeUserId: string;
  mode: ActingMode;
};

function siblingSessionKey(profileId: string) {
  return `${SIBLING_SESSION_PREFIX}${profileId}`;
}

export async function readActingMode(userId: string): Promise<ActingMode | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTING_MODE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; mode: ActingMode };
    return parsed.userId === userId ? parsed.mode : null;
  } catch {
    return null;
  }
}

export async function writeActingMode(userId: string, mode: ActingMode): Promise<void> {
  await AsyncStorage.setItem(ACTING_MODE_STORAGE_KEY, JSON.stringify({ userId, mode }));
}

export async function readLastActiveAccount(): Promise<LastActiveAccountState | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_ACTIVE_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastActiveAccountState;
    if (!parsed.activeUserId || !parsed.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeLastActiveAccount(activeUserId: string, mode: ActingMode): Promise<void> {
  const payload: LastActiveAccountState = { activeUserId, mode };
  await AsyncStorage.setItem(LAST_ACTIVE_ACCOUNT_KEY, JSON.stringify(payload));
}

export async function clearActingMode(): Promise<void> {
  await AsyncStorage.multiRemove([ACTING_MODE_STORAGE_KEY, LAST_ACTIVE_ACCOUNT_KEY]);
}

export async function storeSiblingSession(
  profileId: string,
  session: StoredSiblingSession,
): Promise<void> {
  await SecureStore.setItemAsync(siblingSessionKey(profileId), JSON.stringify(session));
}

export async function readSiblingSession(profileId: string): Promise<StoredSiblingSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(siblingSessionKey(profileId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSiblingSession;
  } catch {
    return null;
  }
}

export async function removeSiblingSession(profileId: string): Promise<void> {
  await SecureStore.deleteItemAsync(siblingSessionKey(profileId));
}
