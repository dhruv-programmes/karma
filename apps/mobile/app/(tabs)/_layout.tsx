import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Home,
  LayoutGrid,
  Leaf,
  ListChecks,
  ScanLine,
  TicketPercent,
  Wrench,
  User,
  type LucideIcon,
} from "lucide-react-native";
import {
  TAB_DOCK_BOTTOM_GAP,
  TAB_DOCK_HEIGHT,
} from "@/src/theme/layout";

type TabBarProps = {
  state: { routes: { key: string; name: string }[]; index: number };
  navigation: any;
};

type DockTab = {
  name: string;
  label: string;
  icon: LucideIcon;
};

const LEFT_TABS: DockTab[] = [
  { name: "index", label: "Home", icon: Home },
  { name: "tools", label: "Tools", icon: Wrench },
];

const RIGHT_TABS: DockTab[] = [
  { name: "actions", label: "Actions", icon: ListChecks },
];

const MORE_DESTINATIONS = [
  {
    name: "impact",
    title: "Impact",
    detail: "Live carbon footprint, solar & rewards",
    icon: Leaf,
    tint: "#5EEAD4",
    soft: "rgba(94,234,212,0.14)",
  },
  {
    name: "offers",
    title: "Offers",
    detail: "Govt subsidies, brand perks & offsets",
    icon: TicketPercent,
    tint: "#F5D08A",
    soft: "rgba(245,208,138,0.16)",
  },
  {
    name: "profile",
    title: "Profile",
    detail: "Account, personas & preferences",
    icon: User,
    tint: "#93C5FD",
    soft: "rgba(147,197,253,0.16)",
  },
] as const;

function DockTabButton({
  item,
  routeKey,
  isFocused,
  navigation,
}: {
  item: DockTab;
  routeKey: string;
  isFocused: boolean;
  navigation: TabBarProps["navigation"];
}) {
  const Icon = item.icon;

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => {
        const event = navigation.emit({
          type: "tabPress",
          target: routeKey,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(item.name);
        }
      }}
      activeOpacity={0.7}
    >
      <Icon
        size={20}
        color={isFocused ? "#2EA86E" : "rgba(255,255,255,0.45)"}
        strokeWidth={isFocused ? 2.2 : 1.8}
      />
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const bottomInset = Math.max(insets.bottom, 8);
  const dockLift = bottomInset + TAB_DOCK_BOTTOM_GAP;

  const routeMeta = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    return {
      key: state.routes[index].key,
      isFocused: state.index === index,
    };
  };

  const activeRoute = state.routes[state.index]?.name;
  const moreActive =
    activeRoute === "impact" || activeRoute === "offers" || moreOpen;

  const openMore = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoreOpen(true);
  };

  const chooseDestination = (name: (typeof MORE_DESTINATIONS)[number]["name"]) => {
    void Haptics.selectionAsync();
    setMoreOpen(false);
    router.push(`/(tabs)/${name}`);
  };

  return (
    <>
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setMoreOpen(false)}
        >
          <Pressable
            style={[
              styles.chooserCard,
              { bottom: dockLift + TAB_DOCK_HEIGHT + 12 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.chooserHandle} />
            <Text style={styles.chooserTitle}>Go further</Text>
            <Text style={styles.chooserSubtitle}>
              Pick where you want to explore next
            </Text>

            <View style={styles.chooserList}>
              {MORE_DESTINATIONS.map((item) => {
                const Icon = item.icon;
                const selected = activeRoute === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.chooserRow,
                      selected && {
                        borderColor: item.tint,
                        backgroundColor: item.soft,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => chooseDestination(item.name)}
                  >
                    <View
                      style={[
                        styles.chooserIcon,
                        { backgroundColor: item.soft },
                      ]}
                    >
                      <Icon size={20} color={item.tint} strokeWidth={2.2} />
                    </View>
                    <View style={styles.chooserCopy}>
                      <Text style={styles.chooserRowTitle}>{item.title}</Text>
                      <Text style={styles.chooserRowDetail}>{item.detail}</Text>
                    </View>
                    {selected ? (
                      <View
                        style={[
                          styles.chooserDot,
                          { backgroundColor: item.tint },
                        ]}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View
        style={[styles.container, { paddingBottom: dockLift, pointerEvents: "box-none" }]}
      >
        <View style={styles.dock}>
          <View style={styles.sideCluster}>
            {LEFT_TABS.map((item) => {
              const meta = routeMeta(item.name);
              if (!meta) return null;
              return (
                <DockTabButton
                  key={item.name}
                  item={item}
                  routeKey={meta.key}
                  isFocused={meta.isFocused}
                  navigation={navigation}
                />
              );
            })}
          </View>

          <View style={styles.scanSlot}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Scan product"
              style={styles.scanButton}
              onPress={() => router.push("/scan")}
              activeOpacity={0.85}
            >
              <ScanLine size={22} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={styles.sideCluster}>
            {RIGHT_TABS.map((item) => {
              const meta = routeMeta(item.name);
              if (!meta) return null;
              return (
                <DockTabButton
                  key={item.name}
                  item={item}
                  routeKey={meta.key}
                  isFocused={meta.isFocused}
                  navigation={navigation}
                />
              );
            })}

            <TouchableOpacity
              style={styles.tabButton}
              onPress={openMore}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="More destinations"
            >
              <LayoutGrid
                size={20}
                color={moreActive ? "#2EA86E" : "rgba(255,255,255,0.45)"}
                strokeWidth={moreActive ? 2.2 : 1.8}
              />
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, moreActive && styles.tabLabelActive]}
              >
                More
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111D16",
    borderRadius: 32,
    height: TAB_DOCK_HEIGHT,
    paddingHorizontal: 6,
    width: "100%",
    ...Platform.select({
      ios: {
        boxShadow: "0px 8px 20px rgba(0,0,0,0.3)",
      },
      android: {
        elevation: 16,
      },
    }),
  },
  sideCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    minWidth: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_DOCK_HEIGHT,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  tabLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 10,
    textAlign: "center",
  },
  tabLabelActive: {
    color: "#5EEAD4",
  },
  scanSlot: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        boxShadow: "0px 4px 10px rgba(46,168,110,0.45)",
      },
      android: { elevation: 8 },
    }),
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 18, 12, 0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  chooserCard: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#14241B",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 6,
    ...Platform.select({
      ios: {
        boxShadow: "0px 12px 24px rgba(0,0,0,0.35)",
      },
      android: { elevation: 20 },
    }),
  },
  chooserHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 8,
  },
  chooserTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  chooserSubtitle: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "rgba(232,255,244,0.72)",
    marginBottom: 8,
  },
  chooserList: {
    gap: 10,
  },
  chooserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chooserIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chooserCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  chooserRowTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  chooserRowDetail: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: "rgba(232,255,244,0.68)",
  },
  chooserDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="actions" options={{ title: "Actions" }} />
      <Tabs.Screen name="impact" options={{ title: "Impact", href: null }} />
      <Tabs.Screen name="offers" options={{ title: "Offers", href: null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
    </Tabs>
  );
}
