import { create } from 'zustand';

type InAppWebState = {
  url: string | null;
  open: (url: string) => void;
  close: () => void;
};

export const useInAppWebStore = create<InAppWebState>((set) => ({
  url: null,
  open: (url) => set({ url }),
  close: () => set({ url: null }),
}));
