import { FloatingTabBarBackground, TabBarBackgroundView } from '@/components/navigation/floatingTabBar';

/** Tab navigator için sabit arka plan referansları — inline () => ile remount önlenir. */
export function DefaultTabBarBackground() {
  return <FloatingTabBarBackground />;
}

export function ReelsTabBarBackground() {
  return <FloatingTabBarBackground variant="reels" />;
}

export { TabBarBackgroundView };
