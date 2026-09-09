import { makeMutable, type SharedValue } from 'react-native-reanimated';

/** 0 = kapalı, 1 = açık — TabSwipeShell ve FeedSideDrawer aynı değeri sürer. */
export const feedDrawerProgress: SharedValue<number> = makeMutable(0);

/** Aktif drawer genişliği (px); jest sırasında progress = translationX / width. */
export const feedDrawerWidthPx: SharedValue<number> = makeMutable(0);

/** Dış jest (tab kaydırma) progress'i sürüyorsa true. */
export const feedDrawerExternallyOwned: SharedValue<boolean> = makeMutable(false);
