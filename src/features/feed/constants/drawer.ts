/** Yan menü genişlik oranı (ekran). */
export const FEED_DRAWER_WIDTH_RATIO = 0.78;

/** Sürüklerken menüyü açma eşiği (0–1). */
export const FEED_DRAWER_OPEN_PROGRESS = 0.32;

/** Sağa fırlatınca menüyü açma hızı (px/s). */
export const FEED_DRAWER_OPEN_VELOCITY_X = 520;

/** Kapatma eşiği / hız — FeedSideDrawer dismiss ile uyumlu. */
export const FEED_DRAWER_DISMISS_PROGRESS = 0.45;
export const FEED_DRAWER_DISMISS_VELOCITY_X = -450;

/** Haptic tetikleme eşiği (sürüklerken). */
export const FEED_DRAWER_HAPTIC_PROGRESS = 0.28;

/**
 * Dikey feed kaydırmasını bozmamak için: pan ancak bu kadar yatay
 * hareketten sonra drawer olarak kabul edilir / liste kilitlenir.
 */
export const FEED_DRAWER_ACTIVATE_TX_PX = 28;
/** Drawer için yatay hareket dikeye göre en az bu çarpan kadar baskın olmalı. */
export const FEED_DRAWER_DOMINANCE_RATIO = 1.35;
