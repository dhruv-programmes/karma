import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Camera,
  Car,
  Leaf,
  MessageCircle,
  Receipt,
  Recycle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
  Sun,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "@/components/custom/screen-header";
import { Text } from "@/components/ui/text";
import { useTabBarClearance } from "@/src/theme/layout";

const tools = [
  {
    label: "Electric Vehicle",
    hint: "Verify an EV to claim rewards & track charging",
    icon: Car,
    route: "/tools/verify-sustainable-purchase",
  },
  {
    label: "Rooftop Solar",
    hint: "Add solar systems & track live clean generation",
    icon: Sun,
    route: "/tools/add-solar",
  },
  {
    label: "Scan Product",
    hint: "Check a product's circular options",
    icon: Camera,
    route: "/scan",
  },
  {
    label: "Import Receipt",
    hint: "Add a purchase to your footprint",
    icon: Receipt,
    route: "/receipt",
  },
  {
    label: "Recycling Hubs",
    hint: "Find a nearby drop-off point",
    icon: Recycle,
    route: "/map?type=recycling",
  },
  {
    label: "Support",
    hint: "Ask about Karma, your score, and the app",
    icon: MessageCircle,
    route: "/support",
  },
] as const;

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const tabClearance = useTabBarClearance();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.root}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: tabClearance,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="TOOLS"
        title="Tools"
        subtitle="Practical ways to measure, reduce, and offset your footprint."
      />

      {/* Universal Sustainability Verification Engine Card */}
      <Animated.View entering={FadeInDown.delay(40).duration(320)}>
        <TouchableOpacity
          style={styles.universalCard}
          onPress={() => router.push("/verify" as any)}
          activeOpacity={0.88}
        >
          <View style={styles.universalGlow} />
          <View style={styles.verificationIconRow}>
            <View style={styles.universalIconBox}>
              <ScanLine size={24} color="#064E3B" strokeWidth={2.2} />
            </View>
            <View style={styles.universalTag}>
              <Sparkles size={12} color="#059669" />
              <Text style={styles.universalTagText}>ECOPROOF ENGINE</Text>
            </View>
          </View>

          <Text style={styles.universalTitle}>Universal Sustainability Verification</Text>
          <Text style={styles.universalSubtitle}>
            Verify solar PV generation, EV ownership, or smart appliances with multimodal local AI.
          </Text>

          <View style={styles.universalFooter}>
            <Text style={styles.universalCtaText}>Open EcoProof Hub ›</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.grid}>
        {tools.map(({ label, hint, icon: Icon, route }) => (
          <TouchableOpacity
            key={label}
            style={styles.toolCard}
            onPress={() => router.push(route as import("expo-router").Href)}
            activeOpacity={0.82}
          >
            <View style={styles.iconBox}>
              <Icon size={22} color="#2EA86E" strokeWidth={2} />
            </View>
            <View style={styles.toolCopy}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDetail}>{hint}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  grid: {
    marginTop: 8,
    gap: 12,
  },
  toolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF8F0",
  },
  toolCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: "#0D1811",
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
  },
  cardDetail: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Nunito_500Medium",
  },
  universalCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  universalGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -40,
    top: -40,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  universalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A7F3D0",
  },
  universalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  universalTagText: {
    color: "#059669",
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  universalTitle: {
    marginTop: 14,
    color: "#064E3B",
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
  },
  universalSubtitle: {
    marginTop: 6,
    color: "#047857",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Nunito_400Regular",
  },
  universalFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  universalCtaText: {
    color: "#059669",
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
  },
});

