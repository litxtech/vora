import { useIsFocused } from 'expo-router';
import type { MainTabRoute } from '@/features/navigation/constants';
import { useMainTabSwipeStore } from '@/features/navigation/store/mainTabSwipeStore';

/**
 * Veri ön-yükleme ve kaydırma önizlemesi — komşu sekme mount kalır, içerik görünür.
 * Ses / video / realtime için kullanılmamalı.
 */
export function useMainTabPrefetchActive(route: MainTabRoute): boolean {
  const isFocused = useIsFocused();
  const warmRoutes = useMainTabSwipeStore((s) => s.warmRoutes);

  return isFocused || warmRoutes.includes(route);
}

/**
 * Seçili sekme — kök stack detayı üstteyken de true kalır.
 * Liste/medya mount tutmak için; oynatma için useMainTabFocused kullan.
 */
export function useMainTabSelected(route: MainTabRoute): boolean {
  const isFocused = useIsFocused();
  const activeRoute = useMainTabSwipeStore((s) => s.activeRoute);
  return isFocused || activeRoute === route;
}

/** Gerçek sekme odağı — ses, video ve realtime yalnızca burada. */
export function useMainTabFocused(): boolean {
  return useIsFocused();
}

/** @deprecated useMainTabPrefetchActive veya useMainTabFocused */
export function useMainTabScreenActive(route: MainTabRoute): boolean {
  return useMainTabPrefetchActive(route);
}
