import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from '@/constants/theme';
import { getProfileGridColumns } from '@/lib/device/androidPerfProfile';

export function useProfileGridLayout(gap: number) {
  const columns = getProfileGridColumns();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const onGridLayout = useCallback((width: number) => {
    if (width > 0) setMeasuredWidth(width);
  }, []);

  const containerWidth = measuredWidth > 0 ? measuredWidth : Math.max(0, windowWidth - spacing.lg * 2);

  const cellSize = useMemo(() => {
    if (containerWidth <= 0) return 0;
    return (containerWidth - gap * (columns - 1)) / columns;
  }, [containerWidth, gap, columns]);

  return {
    columns,
    cellSize,
    gap,
    onGridLayout,
  };
}
