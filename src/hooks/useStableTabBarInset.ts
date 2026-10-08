import { Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/** İlk karede bottom inset 0 gelince tab bar yukarı zıplamasın. */
export function useStableTabBarInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return 0;
  const initialBottom = initialWindowMetrics?.insets.bottom ?? 0;
  return Math.max(insets.bottom, initialBottom);
}
