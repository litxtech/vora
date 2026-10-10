/** Profil sayfası sütunuyla aynı tavan — pencere genişliği hücreyi büyütmesin. */
export const PROFILE_GRID_MAX_WIDTH = 560;

/** Profil gönderi ızgarası — her zaman 3 sütun. */
export const PROFILE_GRID_COLUMNS = 3;

type ProfileGridWidthInput = {
  windowWidth: number;
  measuredWidth?: number;
  fullBleed?: boolean;
  pagePadding: number;
};

/**
 * Izgara genişliği.
 * Tam kenar ızgarası sayfa sütununu kullanır (`min(pencere, 560)`).
 * Ölçülen genişliğe yatay padding eklemek, her layout turunda hücreyi büyütür.
 */
export function resolveProfileGridContainerWidth({
  windowWidth,
  measuredWidth = 0,
  fullBleed = false,
  pagePadding,
}: ProfileGridWidthInput): number {
  const window = Math.max(0, Math.floor(windowWidth));
  if (fullBleed) {
    if (window <= 0) return 0;
    return Math.min(window, PROFILE_GRID_MAX_WIDTH);
  }

  if (measuredWidth > 0) return Math.floor(measuredWidth);
  if (window <= 0) return 0;
  return Math.max(0, Math.min(window, PROFILE_GRID_MAX_WIDTH) - pagePadding * 2);
}

export function resolveProfileGridCellSize(
  containerWidth: number,
  gap: number,
  columns = PROFILE_GRID_COLUMNS,
): number {
  if (containerWidth <= 0 || columns <= 0) return 0;
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}

/** flexWrap kullanmadan, her satır kendi yüksekliğini taşısın. */
export function chunkProfileGridItems<T>(items: readonly T[], columns: number): T[][] {
  if (columns <= 0 || items.length === 0) return [];
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}
