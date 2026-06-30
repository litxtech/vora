import { create } from 'zustand';
import type { MusicSelection } from '@/features/music/types';

type MusicSelectionState = {
  selection: MusicSelection | null;
  setSelection: (selection: MusicSelection | null) => void;
  clearSelection: () => void;
};

export const useMusicSelectionStore = create<MusicSelectionState>((set) => ({
  selection: null,
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),
}));
