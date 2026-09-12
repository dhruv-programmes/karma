import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Camera, Leaf, Receipt, Recycle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useTabBarClearance } from "@/src/theme/layout";

const tools = [
  { label: "Scan Product", detail: "Check a product's circular options", icon: Camera, route: "/scan" },
  { label: "Import Receipt", detail: "Add a purchase to your footprint", icon: Receipt, route: "/receipt" },
  { label: "Recycling Hubs", detail: "Find a nearby drop-off point", icon: Recycle, route: "/map?type=recycling" },
  { label: "Offset Carbon", detail: "Support a verified offset project", icon: Leaf, route: "/offsets" },
] as const;

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: tabClearance,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Tools</Text>
      <Text style={styles.subtitle}>Practical ways to measure, reduce, and offset your footprint.</Text>

      <View style={styles.grid}>
        {tools.map(({ label, detail, icon: Icon, route }) => (
          <TouchableOpacity
            key={label}
            style={styles.card}
            onPress={() => router.push(route)}
            activeOpacity={0.82}
          >
            <View style={styles.iconBox}>
              <Icon size={22} color="#2EA86E" strokeWidth={1.9} />
            </View>
            <Text style={styles.cardTitle}>{label}</Text>
            <Text style={styles.cardDetail}>{detail}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAF8" },
  title: { fontSize: 28, fontFamily: "Schoolbell_400Regular", color: "#0D1811" },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: "Schoolbell_400Regular", color: "#7A9082" },
  grid: { marginTop: 24, gap: 14 },
  card: {
    minHeight: 112,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(46,168,110,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontFamily: "Schoolbell_400Regular", color: "#183222" },
  cardDetail: { marginTop: 3, fontSize: 12, fontFamily: "Schoolbell_400Regular", color: "#7A9082" },
});
