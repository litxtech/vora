import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoryRing } from '@/features/stories/types';

const SEEN_AT_KEY = '@stories/seen_at_v1';

type SeenMap = Record<string, number>;

async function readSeenMap(): Promise<SeenMap> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_AT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SeenMap;
  } catch {
    return {};
  }
}

async function writeSeenMap(map: SeenMap): Promise<void> {
  await AsyncStorage.setItem(SEEN_AT_KEY, JSON.stringify(map));
}

export async function markStoryUserSeen(userId: string): Promise<void> {
  const map = await readSeenMap();
  map[userId] = Date.now();
  await writeSeenMap(map);
}

export async function getStorySeenMap(): Promise<SeenMap> {
  return readSeenMap();
}

export function sortStoryRings(
  rings: StoryRing[],
  seenAt: SeenMap,
  myUserId: string | null,
): StoryRing[] {
  const mine = myUserId ? rings.find((r) => r.userId === myUserId) : undefined;
  const rest = rings.filter((r) => r.userId !== myUserId);

  const unseen = rest
    .filter((r) => r.hasUnseen)
    .sort((a, b) => Date.parse(b.latestItemAt) - Date.parse(a.latestItemAt));

  const seen = rest
    .filter((r) => !r.hasUnseen)
    .sort((a, b) => (seenAt[a.userId] ?? 0) - (seenAt[b.userId] ?? 0));

  return mine ? [mine, ...unseen, ...seen] : [...unseen, ...seen];
}
