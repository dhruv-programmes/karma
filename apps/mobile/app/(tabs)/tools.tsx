import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Camera,
<<<<<<< HEAD
  Leaf,
  MessageCircle,
  Receipt,
  Recycle,
=======
  CheckCircle2,
  Leaf,
  Receipt,
  Recycle,
  ShieldCheck,
  Zap,
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ActionRow } from "@/components/custom/action-row";
import { ScreenHeader } from "@/components/custom/screen-header";
import { useTabBarClearance } from "@/src/theme/layout";
import { useSustainablePurchaseStore } from "@/src/store/sustainable-purchase";

const tools = [
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
    label: "Offset Carbon",
    hint: "Support a verified offset project",
    icon: Leaf,
    route: "/offsets",
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
  const { isVerified, rewardClaimed } = useSustainablePurchaseStore();
  const verified = isVerified || rewardClaimed;

  return (
    <ScrollView
      style={styles.root}
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

<<<<<<< HEAD
      <Animated.View entering={FadeInDown.delay(60).duration(320)}>
        <View style={styles.card}>
          {tools.map((tool, index) => (
            <ActionRow
              key={tool.label}
              icon={tool.icon}
              label={tool.label}
              hint={tool.hint}
              onPress={() =>
                router.push(tool.route as import("expo-router").Href)
              }
              showDivider={index < tools.length - 1}
            />
          ))}
        </View>
      </Animated.View>
=======
      {/* Reward-based Sustainable Purchase Verification Card */}
      <TouchableOpacity
        style={[
          styles.verificationCard,
          verified && styles.verificationCardVerified,
        ]}
        onPress={() => router.push("/tools/verify-sustainable-purchase")}
        activeOpacity={0.88}
      >
        <View
          style={[
            styles.verificationGlow,
            verified && styles.verificationGlowVerified,
          ]}
        />
        <View style={styles.verificationIconRow}>
          <View
            style={[
              styles.verificationIconBox,
              verified && styles.verificationIconBoxVerified,
            ]}
          >
            {verified ? (
              <CheckCircle2 size={24} color="#5EEAD4" strokeWidth={2.2} />
            ) : (
              <Zap size={23} color="#F7C948" fill="#F7C948" strokeWidth={1.8} />
            )}
          </View>
          <View
            style={[
              styles.verificationTag,
              verified && styles.verificationTagVerified,
            ]}
          >
            <ShieldCheck size={13} color={verified ? "#5EEAD4" : "#BFF7D8"} />
            <Text
              style={[
                styles.verificationTagText,
                verified && { color: "#5EEAD4" },
              ]}
            >
              {verified ? "✓ VERIFIED" : "REWARD TOOL"}
            </Text>
          </View>
        </View>

        {verified ? (
          <>
            <Text style={styles.verificationTitle}>⚡ EV Purchase</Text>
            <View style={styles.verifiedBadgeRow}>
              <Text style={styles.verifiedStatusText}>✓ Verified</Text>
              <Text style={styles.verifiedCarModel}>Tata Nexon EV</Text>
            </View>
            <Text style={styles.verificationDetail}>
              Major sustainable purchase verified and recorded to your Impact timeline.
            </Text>
            <View style={styles.verificationFooter}>
              <Text style={styles.verificationRewardEarned}>
                Reward earned: +1,500 Karma Coins
              </Text>
              <Text style={styles.verificationCta}>View Certificate ›</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.verificationTitle}>Verify Sustainable Purchase</Text>
            <Text style={styles.verificationDetail}>
              Verify documents for sustainable purchases and unlock Green Rewards.
            </Text>
            <View style={styles.verificationMeta}>
              <Text style={styles.verificationSupport}>Supported demo verification</Text>
              <Text style={styles.verificationType}>⚡ Electric Vehicle</Text>
            </View>
            <View style={styles.verificationFooter}>
              <Text style={styles.verificationReward}>Up to +1,500 Karma Coins</Text>
              <Text style={styles.verificationCta}>Start verification  ›</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

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
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
    </ScrollView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  root: {
    flex: 1,
    backgroundColor: "#F4FAF6",
  },
=======
  root: { flex: 1, backgroundColor: "#F8FAF8" },
  title: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", color: "#0D1811" },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: "Nunito_400Regular", color: "#7A9082" },
  grid: { marginTop: 24, gap: 14 },
  verificationCard: {
    marginTop: 22,
    minHeight: 222,
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    backgroundColor: "#0E2A1E",
    borderWidth: 1,
    borderColor: "rgba(95, 234, 172, 0.48)",
    boxShadow: "0px 10px 24px rgba(14,42,30,0.24)",
  },
  verificationCardVerified: {
    borderColor: "rgba(94, 234, 212, 0.6)",
    backgroundColor: "#092317",
    boxShadow: "0px 10px 26px rgba(46,168,110,0.3)",
  },
  verificationGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -70,
    top: -80,
    backgroundColor: "rgba(46,168,110,0.25)",
  },
  verificationGlowVerified: {
    backgroundColor: "rgba(94, 234, 212, 0.22)",
    width: 210,
    height: 210,
  },
  verificationIconRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verificationIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,201,72,0.15)",
    borderWidth: 1,
    borderColor: "rgba(247,201,72,0.3)",
  },
  verificationIconBoxVerified: {
    backgroundColor: "rgba(94, 234, 212, 0.15)",
    borderColor: "rgba(94, 234, 212, 0.4)",
  },
  verificationTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  verificationTagVerified: {
    backgroundColor: "rgba(94, 234, 212, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verificationTagText: { color: "#BFF7D8", fontSize: 10, letterSpacing: 1.1, fontFamily: "IBMPlexMono_600SemiBold" },
  verificationTitle: { marginTop: 16, color: "#FFFFFF", fontSize: 20, fontFamily: "Nunito_800ExtraBold" },
  verifiedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  verifiedStatusText: {
    color: "#5EEAD4",
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
  verifiedCarModel: {
    color: "rgba(235,255,244,0.7)",
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  verificationDetail: { marginTop: 5, color: "rgba(235,255,244,0.74)", fontSize: 13, lineHeight: 19, fontFamily: "Nunito_400Regular" },
  verificationMeta: { marginTop: 15, gap: 3 },
  verificationSupport: { color: "rgba(191,247,216,0.65)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "IBMPlexMono_500Medium" },
  verificationType: { color: "#F7C948", fontSize: 13, fontFamily: "Nunito_700Bold" },
  verificationFooter: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  verificationReward: { color: "#FFFFFF", fontSize: 12, fontFamily: "Nunito_700Bold" },
  verificationRewardEarned: { color: "#5EEAD4", fontSize: 13, fontFamily: "Nunito_800ExtraBold" },
  verificationCta: { color: "#8AF0B8", fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(46,168,110,0.16)",
<<<<<<< HEAD
=======
    boxShadow: "0px 2px 10px rgba(0,0,0,0.05)",
    elevation: 2,
>>>>>>> 0a89030986d80ed0ce11f6ef943295ed1c5723ac
  },
});
