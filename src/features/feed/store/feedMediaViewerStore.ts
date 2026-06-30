import { create } from 'zustand';

type FeedMediaViewerState = {
  dismissToken: number;
  /** Reels veya başka sekmeye geçerken açık feed medya oynatıcılarını kapat. */
  dismissAll: () => void;
};

export const useFeedMediaViewerStore = create<FeedMediaViewerState>((set) => ({
  dismissToken: 0,
  dismissAll: () => set((state) => ({ dismissToken: state.dismissToken + 1 })),
}));
