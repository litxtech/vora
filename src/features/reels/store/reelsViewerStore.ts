import { create } from 'zustand';

export type ReelsViewerSession = {
  /** Reel to scroll to on open; user can then browse the full platform feed. */
  anchorReelId: string;
};

type ReelsViewerState = {
  session: ReelsViewerSession | null;
  openSession: (anchorReelId: string) => void;
  clearSession: () => void;
};

export const useReelsViewerStore = create<ReelsViewerState>((set) => ({
  session: null,
  openSession: (anchorReelId) => set({ session: { anchorReelId } }),
  clearSession: () => set({ session: null }),
}));
