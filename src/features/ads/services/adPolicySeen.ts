import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_POLICY_META } from '@/features/ads/constants/adPolicy';

const STORAGE_KEY = 'ads-policy-seen:v1';

type SeenStore = Record<string, string>;

async function readStore(): Promise<SeenStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: SeenStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Kullanıcı geçerli reklam politikası sürümünü görüntülediyse `true` döner.
 * Politika sürümü güncellenirse panel tekrar gösterilir.
 */
export async function hasSeenAdPolicy(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const store = await readStore();
  return store[userId] === AD_POLICY_META.version;
}

/** Kullanıcının geçerli politika sürümünü görüntülediğini kaydeder. */
export async function markAdPolicySeen(userId: string | undefined): Promise<void> {
  if (!userId) return;
  try {
    const store = await readStore();
    if (store[userId] === AD_POLICY_META.version) return;
    store[userId] = AD_POLICY_META.version;
    await writeStore(store);
  } catch {
    // sessizce yoksay — kalıcılık kritik değil
  }
}
