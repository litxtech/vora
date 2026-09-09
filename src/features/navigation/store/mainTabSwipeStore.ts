import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { create } from 'zustand';
import type { MainTabRoute } from '@/features/navigation/constants';

export type MainTabSwipeNeighborSide = 'left' | 'right';

export const mainTabSwipeProgress: SharedValue<number> = makeMutable(0);
export const mainTabSwipeAnimating: SharedValue<boolean> = makeMutable(false);
/** jumpTo sonrası hedef sekme — progress sıfırlanana kadar translateX=0 kilidi. */
export const mainTabSwipeLandingRoute: SharedValue<string | null> = makeMutable(null);

type MainTabSwipeStore = {
  /** Odaktaki kaydırılabilir sekme — komşular buna göre önceden konumlanır. */
  activeRoute: MainTabRoute | null;
  warmRoutes: MainTabRoute[];
  setActiveRoute: (route: MainTabRoute | null) => void;
  setWarmRoutes: (routes: MainTabRoute[]) => void;
};

export const useMainTabSwipeStore = create<MainTabSwipeStore>((set, get) => ({
  activeRoute: null,
  warmRoutes: [],
  setActiveRoute: (activeRoute) => {
    if (get().activeRoute === activeRoute) return;
    set({ activeRoute });
  },
  setWarmRoutes: (warmRoutes) => {
    const prev = get().warmRoutes;
    if (prev.length === warmRoutes.length && prev.every((route, index) => route === warmRoutes[index])) {
      return;
    }
    set({ warmRoutes });
  },
}));
