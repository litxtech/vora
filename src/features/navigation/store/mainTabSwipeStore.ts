import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { create } from 'zustand';
import type { MainTabRoute } from '@/features/navigation/constants';

export type MainTabSwipePartnerSide = 'left' | 'right';

export const mainTabSwipeProgress: SharedValue<number> = makeMutable(0);
export const mainTabSwipeAnimating: SharedValue<boolean> = makeMutable(false);

type MainTabSwipeStore = {
  partnerRoute: MainTabRoute | null;
  partnerSide: MainTabSwipePartnerSide | null;
  setPartner: (route: MainTabRoute | null, side: MainTabSwipePartnerSide | null) => void;
  clearPartner: () => void;
};

export const useMainTabSwipeStore = create<MainTabSwipeStore>((set, get) => ({
  partnerRoute: null,
  partnerSide: null,
  setPartner: (partnerRoute, partnerSide) => {
    const current = get();
    if (current.partnerRoute === partnerRoute && current.partnerSide === partnerSide) return;
    set({ partnerRoute, partnerSide });
  },
  clearPartner: () => {
    if (!get().partnerRoute && !get().partnerSide) return;
    set({ partnerRoute: null, partnerSide: null });
  },
}));
