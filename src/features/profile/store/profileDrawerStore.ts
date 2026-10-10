import { create } from 'zustand';

type ProfileDrawerState = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export const useProfileDrawerStore = create<ProfileDrawerState>((set, get) => ({
  open: false,
  openDrawer: () => {
    if (get().open) return;
    set({ open: true });
  },
  closeDrawer: () => {
    if (!get().open) return;
    set({ open: false });
  },
  toggleDrawer: () => {
    if (get().open) get().closeDrawer();
    else get().openDrawer();
  },
}));
