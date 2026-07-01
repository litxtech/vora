import { create } from 'zustand';
import type { StoryRing } from '@/features/stories/types';

type StoryRingState = {
  rings: StoryRing[];
  loading: boolean;
  nextCursor: string | null;
  regionId: string | null;
  setRegionId: (regionId: string | null) => void;
  setRings: (rings: StoryRing[]) => void;
  appendRings: (rings: StoryRing[]) => void;
  setLoading: (loading: boolean) => void;
  setNextCursor: (cursor: string | null) => void;
  markUserSeen: (userId: string) => void;
  optimisticOwnRing: (ring: StoryRing) => void;
  reset: () => void;
};

export const useStoryRingStore = create<StoryRingState>((set) => ({
  rings: [],
  loading: false,
  nextCursor: null,
  regionId: null,
  setRegionId: (regionId) => set({ regionId }),
  setRings: (rings) => set({ rings }),
  appendRings: (rings) =>
    set((state) => ({
      rings: [...state.rings, ...rings.filter((r) => !state.rings.some((x) => x.userId === r.userId))],
    })),
  setLoading: (loading) => set({ loading }),
  setNextCursor: (nextCursor) => set({ nextCursor }),
  markUserSeen: (userId) =>
    set((state) => ({
      rings: state.rings.map((r) => (r.userId === userId ? { ...r, hasUnseen: false } : r)),
    })),
  optimisticOwnRing: (ring) =>
    set((state) => {
      const rest = state.rings.filter((r) => r.userId !== ring.userId);
      return { rings: [ring, ...rest] };
    }),
  reset: () => set({ rings: [], loading: false, nextCursor: null }),
}));
