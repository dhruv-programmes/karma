import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Floating tab dock height (matches CustomTabBar styles.dock.height). */
export const TAB_DOCK_HEIGHT = 64;

/**
 * Bottom padding so scroll content clears the absolute floating tab bar.
 * Includes dock height, safe-area padding under the dock, and breathing room.
 */
export function useTabBarClearance(extra = 24) {
  const insets = useSafeAreaInsets();
  return TAB_DOCK_HEIGHT + Math.max(insets.bottom, 12) + 16 + extra;
}
