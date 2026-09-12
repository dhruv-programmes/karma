import React from "react";
import { Platform, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Leaf,
  ListChecks,
  ScanLine,
  TicketPercent,
  Wrench,
} from "lucide-react-native";
import {
  TAB_DOCK_BOTTOM_GAP,
  TAB_DOCK_HEIGHT,
} from "@/src/theme/layout";

type TabBarProps = {
  state: { routes: { key: string; name: string }[]; index: number };
  navigation: {
    emit: (e: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomInset = Math.max(insets.bottom, 8);

  const tabItems = [
    { name: "index", label: "Home", icon: Home },
    { name: "tools", label: "Tools", icon: Wrench },
    { name: "impact", label: "Impact", icon: Leaf },
    { name: "actions", label: "Actions", icon: ListChecks },
    { name: "offers", label: "Offers", icon: TicketPercent },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: bottomInset + TAB_DOCK_BOTTOM_GAP },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const item = tabItems.find((t) => t.name === route.name);
          if (!item) return null;

          const isFocused = state.index === index;
          const Icon = item.icon;

          return (
            <React.Fragment key={route.key}>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon
                  size={19}
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
              {route.name === "tools" ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Scan product"
                  style={styles.scanButton}
                  onPress={() => router.push("/scan")}
                  activeOpacity={0.85}
                >
                  <ScanLine size={22} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
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
    justifyContent: "space-between",
    backgroundColor: "#111D16",
    borderRadius: 32,
    height: TAB_DOCK_HEIGHT,
    paddingHorizontal: 6,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
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
    fontSize: 9.5,
    textAlign: "center",
  },
  tabLabelActive: {
    color: "#5EEAD4",
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2EA86E",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#2EA86E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
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
      <Tabs.Screen name="impact" options={{ title: "Impact" }} />
      <Tabs.Screen name="actions" options={{ title: "Actions" }} />
      <Tabs.Screen name="offers" options={{ title: "Offers" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
    </Tabs>
  );
}
