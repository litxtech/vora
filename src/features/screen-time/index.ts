/**
 * Ekran Süresi (Screen Time) — uygulama yalnızca ön plandayken (açıkken) geçen
 * süreyi sayar. Arka plan ve kapalı durum sayılmaz. Olay tabanlı, cihazda saklanır.
 *
 * Public API — özellikler arası import yalnızca buradan yapılmalı.
 */
export { SCREEN_TIME_FEATURE_NAME } from '@/features/screen-time/constants';
export { ScreenTimeScreen } from '@/features/screen-time/components/ScreenTimeScreen';
export { useScreenTime } from '@/features/screen-time/hooks/useScreenTime';
export {
  startScreenTimeTracking,
  stopScreenTimeTracking,
  getScreenTimeSnapshot,
  resetScreenTime,
  setScreenTimeGoal,
  exportScreenTimeData,
} from '@/features/screen-time/services/screenTimeTracker';
export type {
  ScreenTimeSnapshot,
  ScreenTimeDay,
  ScreenTimeWeekCompare,
} from '@/features/screen-time/types';
