import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { SHAKE_TO_COMPOSE_STORAGE_KEY } from '@/features/compose/constants/shakeToCompose';

type ShakeToComposeStore = {
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (enabled: boolean) => void;
  hydrate: () => Promise<void>;
};

export const useShakeToComposeStore = create<ShakeToComposeStore>((set, get) => ({
  enabled: false,
  hydrated: false,
  setEnabled: (enabled) => {
    set({ enabled, hydrated: true });
    void AsyncStorage.setItem(SHAKE_TO_COMPOSE_STORAGE_KEY, enabled ? '1' : '0');
  },
  hydrate: async () => {
    if (get().hydrated) return;

    const raw = await AsyncStorage.getItem(SHAKE_TO_COMPOSE_STORAGE_KEY);
    set((state) => {
      if (state.hydrated) return state;
      return { enabled: raw === '1', hydrated: true };
    });
  },
}));
