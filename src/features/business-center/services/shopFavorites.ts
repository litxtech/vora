import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'business-shop-favorites:v1';

type FavoriteStore = Record<string, string[]>;

async function readStore(): Promise<FavoriteStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FavoriteStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: FavoriteStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function getShopFavoriteIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const store = await readStore();
  return new Set(store[userId] ?? []);
}

export async function toggleShopFavorite(
  userId: string,
  businessId: string,
): Promise<{ saved: boolean; error: string | null }> {
  try {
    const store = await readStore();
    const current = new Set(store[userId] ?? []);
    const saved = !current.has(businessId);
    if (saved) current.add(businessId);
    else current.delete(businessId);
    store[userId] = [...current];
    await writeStore(store);
    return { saved, error: null };
  } catch (err) {
    return { saved: false, error: String(err) };
  }
}
