import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from '@/constants/theme';

/** Profil gönderi ızgarası — her zaman Instagram gibi 3 sütun. */
export const PROFILE_GRID_COLUMNS = 3;

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
    if (width > 0) setMeasuredWidth(width);
  }, []);

  const containerWidth = useMemo(() => {
    if (fullBleed) {
      // Negatif margin ile genişleyen view onLayout'ta dar kalabilir — ekran genişliğini kullan.
      return Math.max(0, Math.floor(windowWidth));
    }
    const width = measuredWidth > 0 ? measuredWidth : windowWidth - pagePadding * 2;
    return Math.max(0, Math.floor(width));
  }, [fullBleed, measuredWidth, windowWidth, pagePadding]);

  const cellSize = useMemo(() => {
    if (containerWidth <= 0) return 0;
    // floor: float taşması 3. hücreyi alt satıra düşürüp 2'li dizilim gibi gösterir.
    return Math.floor((containerWidth - gap * (columns - 1)) / columns);
  }, [containerWidth, gap, columns]);

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
