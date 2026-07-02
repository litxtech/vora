import { useIsFocused } from 'expo-router';
import type { MainTabRoute } from '@/features/navigation/constants';
import { useMainTabSwipeStore } from '@/features/navigation/store/mainTabSwipeStore';

/**
 * Veri ön-yükleme ve kaydırma önizlemesi — komşu sekme mount kalır, içerik görünür.
 * Ses / video / realtime için kullanılmamalı.
 */
export function useMainTabPrefetchActive(route: MainTabRoute): boolean {
  const isFocused = useIsFocused();
  const partnerRoute = useMainTabSwipeStore((s) => s.partnerRoute);
  const warmRoutes = useMainTabSwipeStore((s) => s.warmRoutes);

  return isFocused || partnerRoute === route || warmRoutes.includes(route);
}

/** Gerçek sekme odağı — ses, video ve realtime yalnızca burada. */
export function useMainTabFocused(): boolean {
  return useIsFocused();
}

/** @deprecated useMainTabPrefetchActive veya useMainTabFocused */
export function useMainTabScreenActive(route: MainTabRoute): boolean {
  return useMainTabPrefetchActive(route);
}
