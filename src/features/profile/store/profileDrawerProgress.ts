import { makeMutable, type SharedValue } from 'react-native-reanimated';

/** 0 = kapalı, 1 = açık. TabSwipeShell ve profil çekmecesi aynı değeri sürer. */
export const profileDrawerProgress: SharedValue<number> = makeMutable(0);

/** Aktif çekmece genişliği (px). */
export const profileDrawerWidthPx: SharedValue<number> = makeMutable(0);

/** Dış jest progress'i sürüyorsa true — store animasyonu titreme yaratmasın. */
export const profileDrawerExternallyOwned: SharedValue<boolean> = makeMutable(false);
