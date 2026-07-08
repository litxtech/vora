import type { FeatureId } from '@/features/feature-flags/types';

export type MainTabRoute =
  | 'index'
  | 'discover'
  | 'centers'
  | 'messages'
  | 'reels'
  | 'profile';

export type MainTabSwipeDef = {
  route: MainTabRoute;
  featureId: FeatureId;
};

/** Alt tab bar sırası — `map` ve `admin` kaydırma geçişine dahil edilmez. */
export const MAIN_TAB_SWIPE_ORDER: MainTabSwipeDef[] = [
  { route: 'index', featureId: 'feed' },
  { route: 'discover', featureId: 'discover' },
  { route: 'messages', featureId: 'messages' },
  { route: 'reels', featureId: 'reels' },
  { route: 'profile', featureId: 'profile' },
];

/** Harita pan jestleriyle çakışmaması için kaydırma kapalı. */
export const MAIN_TAB_SWIPE_DISABLED_ROUTES = new Set<string>(['map', 'create', 'admin']);

export const MAIN_TAB_SWIPE_DISTANCE_PX = 72;
export const MAIN_TAB_SWIPE_VELOCITY_PX = 520;

/** Kaydırma sırasında kenarda görünen sekme önizlemesi. */
export const MAIN_TAB_LABELS: Record<MainTabRoute, string> = {
  index: 'Akış',
  discover: 'Keşfet',
  centers: 'Merkez',
  messages: 'Mesaj',
  reels: 'Reels',
  profile: 'Profil',
};

export const MAIN_TAB_SWIPE_SNAP_RATIO = 0.34;
export const MAIN_TAB_SWIPE_COMPLETE_MS = 300;

export const MAIN_TAB_SWIPE_ROUTES = new Set<MainTabRoute>(
  MAIN_TAB_SWIPE_ORDER.map((tab) => tab.route),
);
