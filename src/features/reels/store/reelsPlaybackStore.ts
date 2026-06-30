import { create } from 'zustand';

type ReelsPlaybackState = {
  activeIndex: number;
  itemCount: number;
  isScrolling: boolean;
  setActiveIndex: (index: number) => void;
  setItemCount: (count: number) => void;
  setScrolling: (scrolling: boolean) => void;
};

export const useReelsPlaybackStore = create<ReelsPlaybackState>((set) => ({
  activeIndex: 0,
  itemCount: 0,
  isScrolling: false,
  setActiveIndex: (index) => set({ activeIndex: index }),
  setItemCount: (count) => set({ itemCount: count }),
  setScrolling: (scrolling) => set({ isScrolling: scrolling }),
}));
