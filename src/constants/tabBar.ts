/** Tab bar icon + label area (floating card height). */
export const TAB_BAR_CONTENT_HEIGHT = 60;

/** Horizontal margin from screen edges. */
export const FLOATING_TAB_BAR_SIDE_MARGIN = 14;

/** Gap between floating card and system navigation / home indicator. */
export const FLOATING_TAB_BAR_BOTTOM_GAP = 6;

/** Tab bar card only — system inset is added separately (e.g. ReelOverlay). */
export const FLOATING_TAB_BAR_CONTENT_INSET = TAB_BAR_CONTENT_HEIGHT + FLOATING_TAB_BAR_BOTTOM_GAP;

/** Total bottom space lists/scenes should reserve (card + gap + Android/iOS nav inset). */
export function getFloatingTabBarReserve(bottomInset: number): number {
  return FLOATING_TAB_BAR_CONTENT_INSET + bottomInset;
}
