import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from '@/constants/theme';
import {
  PROFILE_GRID_COLUMNS,
  resolveProfileGridCellSize,
  resolveProfileGridContainerWidth,
} from '@/features/profile/services/profileGridMetrics';

export { PROFILE_GRID_COLUMNS, PROFILE_GRID_MAX_WIDTH } from '@/features/profile/services/profileGridMetrics';

type ProfileGridLayoutOptions = {
  /** Sayfa yatay padding'ini iptal ederek kenardan kenara ızgara. */
  fullBleed?: boolean;
  pagePadding?: number;
};

export function useProfileGridLayout(gap: number, options?: ProfileGridLayoutOptions) {
  const columns = PROFILE_GRID_COLUMNS;
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const fullBleed = options?.fullBleed ?? false;
  const pagePadding = options?.pagePadding ?? spacing.lg;

  const onGridLayout = useCallback((width: number) => {
    if (fullBleed) return;
    const next = Math.floor(width);
    if (next <= 0) return;
    setMeasuredWidth((prev) => (prev === next ? prev : next));
  }, [fullBleed]);

  const containerWidth = useMemo(
    () =>
      resolveProfileGridContainerWidth({
        windowWidth,
        measuredWidth,
        fullBleed,
        pagePadding,
      }),
    [fullBleed, measuredWidth, pagePadding, windowWidth],
  );

  const cellSize = useMemo(
    () => resolveProfileGridCellSize(containerWidth, gap, columns),
    [containerWidth, gap, columns],
  );

  return {
    columns,
    cellSize,
    gap,
    pagePadding,
    fullBleed,
    containerWidth,
    onGridLayout,
  };
}
