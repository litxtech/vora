import { create } from 'zustand';
import type { StoryBundle, StoryViewerSession } from '@/features/stories/types';

type StoryViewerState = {
  session: StoryViewerSession | null;
  bundles: Record<string, StoryBundle | undefined>;
  currentUserIndex: number;
  currentItemIndex: number;
  openSession: (session: StoryViewerSession) => void;
  setBundle: (authorId: string, bundle: StoryBundle | null) => void;
  setCurrentUserIndex: (index: number) => void;
  setCurrentItemIndex: (index: number) => void;
  clear: () => void;
};

export const useStoryViewerStore = create<StoryViewerState>((set) => ({
  session: null,
  bundles: {},
  currentUserIndex: 0,
  currentItemIndex: 0,
  openSession: (session) => {
    const userIndex = Math.max(0, session.ringUserIds.indexOf(session.startUserId));
    set({
      session,
      currentUserIndex: userIndex,
      currentItemIndex: session.startItemIndex ?? 0,
      bundles: {},
    });
  },
  setBundle: (authorId, bundle) =>
    set((state) => ({
      bundles: bundle
        ? { ...state.bundles, [authorId]: bundle }
        : { ...state.bundles, [authorId]: undefined },
    })),
  setCurrentUserIndex: (currentUserIndex) => set({ currentUserIndex, currentItemIndex: 0 }),
  setCurrentItemIndex: (currentItemIndex) => set({ currentItemIndex }),
  clear: () =>
    set({
      session: null,
      bundles: {},
      currentUserIndex: 0,
      currentItemIndex: 0,
    }),
}));
