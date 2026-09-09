import { create } from 'zustand';

type FeedRowVisibilityState = {
  /** Satır id → görünür. Selector boolean döndürürse yalnızca değişen satırlar re-render olur. */
  visibleById: Record<string, boolean>;
  replaceVisible: (ids: Set<string>) => void;
  clear: () => void;
};

function setsEqualToVisibleMap(ids: Set<string>, map: Record<string, boolean>): boolean {
  let trueCount = 0;
  for (const key of Object.keys(map)) {
    if (map[key]) trueCount += 1;
  }
  if (trueCount !== ids.size) return false;
  for (const id of ids) {
    if (!map[id]) return false;
  }
  return true;
}

/**
 * Feed listesi görünürlük durumu — FeedList state'inde Set tutup renderItem'ı
 * yeniden bağlamadan, satır bazlı abonelik ile güncellenir.
 */
export const useFeedRowVisibilityStore = create<FeedRowVisibilityState>((set, get) => ({
  visibleById: {},
  replaceVisible: (ids) => {
    const prev = get().visibleById;
    if (setsEqualToVisibleMap(ids, prev)) return;

    const next: Record<string, boolean> = {};
    for (const id of ids) {
      next[id] = true;
    }
    // Önceki true'ları false tut (selector eski abonelerde false → true geçişini görsün)
    for (const key of Object.keys(prev)) {
      if (prev[key] && !ids.has(key)) {
        next[key] = false;
      }
    }
    set({ visibleById: next });
  },
  clear: () => {
    if (Object.keys(get().visibleById).length === 0) return;
    set({ visibleById: {} });
  },
}));
