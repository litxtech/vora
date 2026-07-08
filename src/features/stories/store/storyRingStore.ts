import { create } from 'zustand';
import type { StoryRing } from '@/features/stories/types';

type StoryRingState = {
  rings: StoryRing[];
  loading: boolean;
  nextCursor: string | null;
  regionId: string | null;
  viewerId: string | null;
  enteringUserIds: string[];
  setRegionId: (regionId: string | null) => void;
  setViewerId: (viewerId: string | null) => void;
  setRings: (rings: StoryRing[]) => void;
  appendRings: (rings: StoryRing[]) => void;
  setLoading: (loading: boolean) => void;
  setNextCursor: (cursor: string | null) => void;
  hydrateFromCache: (rings: StoryRing[], nextCursor: string | null, viewerId: string) => void;
  applyRingsUpdate: (
    rings: StoryRing[],
    nextCursor: string | null,
    options?: { animate?: boolean },
  ) => void;
  clearEnteringUserIds: () => void;
  markUserSeen: (userId: string) => void;
  optimisticOwnRing: (ring: StoryRing) => void;
  reset: () => void;
};

function diffEnteringUserIds(prev: StoryRing[], next: StoryRing[]): string[] {
  const prevIds = new Set(prev.map((ring) => ring.userId));
  return next.map((ring) => ring.userId).filter((userId) => !prevIds.has(userId));
}

export const useStoryRingStore = create<StoryRingState>((set, get) => ({
  rings: [],
  loading: false,
  nextCursor: null,
  regionId: null,
  viewerId: null,
  enteringUserIds: [],
  setRegionId: (regionId) => set({ regionId }),
  setViewerId: (viewerId) => set({ viewerId }),
  setRings: (rings) => set({ rings, enteringUserIds: [] }),
  appendRings: (rings) =>
    set((state) => ({
      rings: [...state.rings, ...rings.filter((r) => !state.rings.some((x) => x.userId === r.userId))],
    })),
  setLoading: (loading) => set({ loading }),
  setNextCursor: (nextCursor) => set({ nextCursor }),
  hydrateFromCache: (rings, nextCursor, viewerId) =>
    set({
      rings,
      nextCursor,
      viewerId,
      loading: false,
      enteringUserIds: [],
    }),
  applyRingsUpdate: (rings, nextCursor, options) => {
    const prev = get().rings;
    const enteringUserIds = options?.animate ? diffEnteringUserIds(prev, rings) : [];
    set({ rings, nextCursor, enteringUserIds });
  },
  clearEnteringUserIds: () => set({ enteringUserIds: [] }),
  markUserSeen: (userId) =>
    set((state) => ({
      rings: state.rings.map((r) => (r.userId === userId ? { ...r, hasUnseen: false } : r)),
    })),
  optimisticOwnRing: (ring) =>
    set((state) => {
      const rest = state.rings.filter((r) => r.userId !== ring.userId);
      return { rings: [ring, ...rest], enteringUserIds: [ring.userId] };
    }),
  reset: () =>
    set({
      rings: [],
      loading: false,
      nextCursor: null,
      viewerId: null,
      enteringUserIds: [],
    }),
}));
