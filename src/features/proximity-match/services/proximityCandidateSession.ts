import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFERED_KEY_PREFIX = 'proximity-match:offered-ids:';

/** Bu oturum + disk: bir kişiye eşleşme kartı en fazla 1 kez açılır (hesap başına). */
const offeredIds = new Set<string>();
let activeUserId: string | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function storageKey(userId: string): string {
  return `${OFFERED_KEY_PREFIX}${userId}`;
}

async function ensureHydrated(userId: string): Promise<void> {
  if (hydrated && activeUserId === userId) return;
  if (hydratePromise && activeUserId === userId) return hydratePromise;

  activeUserId = userId;
  hydrated = false;
  offeredIds.clear();

  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(userId));
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (typeof id === 'string' && id) offeredIds.add(id);
          }
        }
      }
    } catch {
      /* bozuk kayıt — boş set ile devam */
    } finally {
      hydrated = true;
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

async function persistOffered(userId: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify([...offeredIds]));
}

export async function hydrateProximityOfferedCandidates(userId: string): Promise<void> {
  await ensureHydrated(userId);
}

export async function wasProximityCandidateOffered(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  await ensureHydrated(userId);
  return offeredIds.has(otherUserId);
}

/** Kart bir kez gösterildi / yanıtlandı — aynı kişiye tekrar açılmaz. */
export async function markProximityCandidateOffered(
  userId: string,
  otherUserId: string,
): Promise<void> {
  await ensureHydrated(userId);
  if (offeredIds.has(otherUserId)) return;
  offeredIds.add(otherUserId);
  await persistOffered(userId);
}

export function clearProximityOfferedMemory(): void {
  offeredIds.clear();
  activeUserId = null;
  hydrated = false;
  hydratePromise = null;
}
