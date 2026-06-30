import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { EXPLORER_MODE_STORAGE_KEY } from '@/features/explorer/constants';

type ExplorerStore = {
  modeEnabled: boolean;
  hydrated: boolean;
  setModeEnabled: (enabled: boolean) => void;
  hydrate: () => Promise<void>;
};

export const useExplorerStore = create<ExplorerStore>((set, get) => ({
  modeEnabled: false,
  hydrated: false,
  setModeEnabled: (enabled) => {
    set({ modeEnabled: enabled, hydrated: true });
    void AsyncStorage.setItem(EXPLORER_MODE_STORAGE_KEY, enabled ? '1' : '0');
  },
  hydrate: async () => {
    if (get().hydrated) return;

    const raw = await AsyncStorage.getItem(EXPLORER_MODE_STORAGE_KEY);
    set((state) => {
      if (state.hydrated) return state;
      return { modeEnabled: raw === '1', hydrated: true };
    });
  },
}));
