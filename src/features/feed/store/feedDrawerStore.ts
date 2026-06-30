import { create } from 'zustand';

type FeedDrawerState = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export const useFeedDrawerStore = create<FeedDrawerState>((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  toggleDrawer: () => set((state) => ({ open: !state.open })),
}));
