import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Floating tab dock height — keep in sync with styles.dock.height in (tabs)/_layout */
export const TAB_DOCK_HEIGHT = 64;
/** Gap between dock and home-indicator / screen bottom */
export const TAB_DOCK_BOTTOM_GAP = 10;

/**
 * Bottom padding so scroll content clears the absolute floating tab bar.
 * Includes dock height, safe-area inset, float gap, and breathing room.
 */
export function useTabBarClearance(extra = 24) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return TAB_DOCK_HEIGHT + bottomInset + TAB_DOCK_BOTTOM_GAP + 16 + extra;
}
