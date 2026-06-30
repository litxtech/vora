import { create } from 'zustand';

type FeedVideoPlaybackState = {
  /** Akışta oynatılacak tek video gönderisi */
  activePostId: string | null;
  /** Ses açık olan gönderi (aynı anda en fazla bir) */
  unmutedPostId: string | null;
  /** Dikey kaydırma devam ediyor — aktif video geçişi ertelenir */
  isScrolling: boolean;
  setActivePost: (postId: string | null) => void;
  setScrolling: (scrolling: boolean) => void;
  toggleUnmuted: (postId: string) => void;
  clear: () => void;
};

export const useFeedVideoPlaybackStore = create<FeedVideoPlaybackState>((set, get) => ({
  activePostId: null,
  unmutedPostId: null,
  isScrolling: false,
  setActivePost: (postId) => {
    const prev = get().activePostId;
    if (prev === postId) return;
    set({
      activePostId: postId,
      unmutedPostId: get().unmutedPostId === postId ? get().unmutedPostId : null,
    });
  },
  setScrolling: (scrolling) => set({ isScrolling: scrolling }),
  toggleUnmuted: (postId) => {
    set({ unmutedPostId: get().unmutedPostId === postId ? null : postId });
  },
  clear: () => set({ activePostId: null, unmutedPostId: null, isScrolling: false }),
}));
