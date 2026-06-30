import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AUTH_BACKUP_PREFIX = 'supabase.auth.backup.';
const SECURESTORE_CHUNK_SIZE = 1800;

async function readSecureChunks(key: string): Promise<string | null> {
  const chunkCountRaw = await SecureStore.getItemAsync(`${AUTH_BACKUP_PREFIX}${key}.chunks`);
  if (!chunkCountRaw) return null;

  const chunkCount = Number(chunkCountRaw);
  if (!Number.isFinite(chunkCount) || chunkCount <= 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    const part = await SecureStore.getItemAsync(`${AUTH_BACKUP_PREFIX}${key}.${i}`);
    if (part == null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function writeSecureChunks(key: string, value: string): Promise<void> {
  if (!value) {
    await clearSecureBackup(key);
    return;
  }

  const chunks = Math.ceil(value.length / SECURESTORE_CHUNK_SIZE);
  const chunkCountRaw = await SecureStore.getItemAsync(`${AUTH_BACKUP_PREFIX}${key}.chunks`);
  const previousChunkCount = Number(chunkCountRaw);
  const oldChunkCount =
    Number.isFinite(previousChunkCount) && previousChunkCount > 0 ? previousChunkCount : 0;

  for (let i = 0; i < chunks; i += 1) {
    const start = i * SECURESTORE_CHUNK_SIZE;
    const part = value.slice(start, start + SECURESTORE_CHUNK_SIZE);
    await SecureStore.setItemAsync(`${AUTH_BACKUP_PREFIX}${key}.${i}`, part);
  }

  for (let i = chunks; i < oldChunkCount; i += 1) {
    await SecureStore.deleteItemAsync(`${AUTH_BACKUP_PREFIX}${key}.${i}`);
  }

  await SecureStore.setItemAsync(`${AUTH_BACKUP_PREFIX}${key}.chunks`, String(chunks));
}

async function clearSecureBackup(key: string): Promise<void> {
  const chunkCountRaw = await SecureStore.getItemAsync(`${AUTH_BACKUP_PREFIX}${key}.chunks`);
  if (chunkCountRaw) {
    const chunkCount = Number(chunkCountRaw);
    if (Number.isFinite(chunkCount) && chunkCount > 0) {
      for (let i = 0; i < chunkCount; i += 1) {
        await SecureStore.deleteItemAsync(`${AUTH_BACKUP_PREFIX}${key}.${i}`);
      }
    }
    await SecureStore.deleteItemAsync(`${AUTH_BACKUP_PREFIX}${key}.chunks`);
  }
}

/**
 * Supabase oturumu:
 * - Birincil depo: SecureStore (cihaz güvenli alanı)
 * - Eski kurulumlar: AsyncStorage'dan okunup SecureStore'a taşınır, sonra silinir
 */
export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const secure = await readSecureChunks(key);
    if (secure) {
      void AsyncStorage.removeItem(key);
      return secure;
    }

    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      try {
        await writeSecureChunks(key, legacy);
        await AsyncStorage.removeItem(key);
      } catch {
        return legacy;
      }
    }
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!value) {
      await AsyncStorage.removeItem(key);
      await clearSecureBackup(key);
      return;
    }

    await writeSecureChunks(key, value);
    await AsyncStorage.removeItem(key);
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await clearSecureBackup(key);
  },
};
