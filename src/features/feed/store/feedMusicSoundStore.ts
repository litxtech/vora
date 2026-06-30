import { create } from 'zustand';

type FeedMusicSoundState = {
  postId: string | null;
  togglePost: (postId: string) => void;
  clear: () => void;
};

/** Akışta aynı anda yalnızca bir gönderinin müziği açık kalır. */
export const useFeedMusicSoundStore = create<FeedMusicSoundState>((set, get) => ({
  postId: null,
  togglePost: (postId) => {
    set({ postId: get().postId === postId ? null : postId });
  },
  clear: () => set({ postId: null }),
}));
