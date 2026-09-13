import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Wrench,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { computeBaselineFootprint, useAuthStore } from "@/src/store/auth";

export default function RevealScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const baseline = useAuthStore((s) => s.baseline);
  const goal = useAuthStore((s) => s.goal);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const computed = computeBaselineFootprint(baseline);
  const reductionPct = goal.reductionPct ?? 15;
  const startingFootprint = computed.totalKg; // e.g. 118
  const targetFootprint = Math.max(1, Math.round(startingFootprint * (1 - reductionPct / 100)));
  const startingScore = computed.score; // e.g. 632

  // Category breakdown percentages
  const transportPct = startingFootprint > 0 ? Math.round((computed.transportKg / startingFootprint) * 100) : 73;
  const shoppingPct = startingFootprint > 0 ? Math.round((computed.shoppingKg / startingFootprint) * 100) : 10;
  const homePct = Math.max(0, 100 - transportPct - shoppingPct);

  function handleContinue() {
    setOnboardingStep("location");
    router.push("/onboarding/location" as import("expo-router").Href);
  }

  return (
    <Box
      className="flex-1"
      style={{
        backgroundColor: "#F4F8F5",
        paddingTop: insets.top + 14,
        paddingBottom: insets.bottom + 18,
        paddingHorizontal: 22,
      }}
    >
      {/* 1. Full-bleed Botanical Background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require("@/assets/carbon-loop-welcome-bg.jpg")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>

      {/* Top Bar Navigation */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-[#E1EDE4]"
          style={styles.headerBtnShadow}
          hitSlop={8}
        >
          <ArrowLeft size={18} color="#112318" />
        </Pressable>

        <Box className="px-3.5 py-1.5 rounded-full bg-white/90 border border-[#CDE5D6] shadow-sm">
          <Text size="xs" bold className="text-[#1E5E3A] font-mono uppercase text-[11px] tracking-wider">
            Baseline Estimate
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs" className="mb-1">
          <Heading size="2xl" className="font-heading text-[#112318] text-[28px] leading-tight">
            Your starting point
          </Heading>
          <Text size="sm" className="text-[#527060] mt-0.5 leading-relaxed font-body">
            Based on what you've told us
          </Text>
        </VStack>

        {/* Hero Score Card with Glassmorphism */}
        <View style={styles.glassCard}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.86)", "rgba(255, 255, 255, 0.65)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroScoreContent}>
            <View style={styles.sparkleIconCircle}>
              <Sparkles size={22} color="#1E5E3A" />
            </View>
            <Text style={styles.heroScoreNumber}>
              {startingScore}
            </Text>
            <Text style={styles.heroScoreTag}>
              Provisional Carbon Credit Score
            </Text>
            <Text style={styles.heroScoreDesc}>
              This questionnaire-based estimate uses the 480–820 KCS range. Your verified score arrives after sufficient real footprint data across receipts, transactions, categories, and history.
            </Text>
          </View>
        </View>

        {/* Estimated Footprint & Breakdown */}
        <View style={styles.glassCard}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.84)", "rgba(255, 255, 255, 0.64)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.footprintContent}>
            <View style={styles.footprintHeader}>
              <View>
                <Text style={styles.footprintSmallTag}>
                  Estimated Footprint
                </Text>
                <HStack className="items-baseline gap-1.5 mt-0.5">
                  <Text style={styles.footprintBigNumber}>
                    {startingFootprint}
                  </Text>
                  <Text style={styles.footprintUnit}>
                    kg CO₂e / month
                  </Text>
                </HStack>
              </View>

              <View style={styles.baselinePill}>
                <Text style={styles.baselinePillText}>
                  Baseline
                </Text>
              </View>
            </View>

            {/* Visual Percentage Bar */}
            <View style={styles.percentBarContainer}>
              <View style={[styles.percentBarSegment, { width: `${transportPct}%`, backgroundColor: "#2EA86E" }]} />
              <View style={[styles.percentBarSegment, { width: `${shoppingPct}%`, backgroundColor: "#1E5E3A" }]} />
              <View style={[styles.percentBarSegment, { width: `${homePct}%`, backgroundColor: "rgba(30, 94, 58, 0.35)" }]} />
            </View>

            {/* Legend Row */}
            <HStack className="justify-between items-center pt-0.5 flex-wrap gap-y-1.5 gap-x-2">
              <HStack className="items-center gap-1.5 shrink min-w-0">
                <View style={[styles.legendDot, { backgroundColor: "#2EA86E" }]} />
                <Text style={styles.legendText}>
                  Transport {transportPct}%
                </Text>
              </HStack>
              <HStack className="items-center gap-1.5 shrink min-w-0">
                <View style={[styles.legendDot, { backgroundColor: "#1E5E3A" }]} />
                <Text style={styles.legendText}>
                  Shopping {shoppingPct}%
                </Text>
              </HStack>
              <HStack className="items-center gap-1.5 shrink min-w-0">
                <View style={[styles.legendDot, { backgroundColor: "rgba(30, 94, 58, 0.35)" }]} />
                <Text style={styles.legendText}>
                  Home {homePct}%*
                </Text>
              </HStack>
            </HStack>

            <Text style={styles.homeFootnote}>
              *Home energy is an estimated initial baseline until utility bills or energy data are connected.
            </Text>
          </View>
        </View>

        {/* Goal Transition Visual */}
        <View style={styles.goalCard}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.84)", "rgba(255, 255, 255, 0.64)"]}
            style={StyleSheet.absoluteFill}
          />

          <HStack className="items-center justify-between">
            <VStack>
              <Text style={styles.goalTitle}>
                Your 1st Month Goal
              </Text>
              <Text style={styles.goalReduction}>
                −{reductionPct}% reduction
              </Text>
            </VStack>

            <HStack className="items-center gap-2">
              <View style={styles.startingKgPill}>
                <Text style={styles.startingKgText}>
                  {startingFootprint} kg
                </Text>
              </View>
              <ArrowRight size={14} color="#1E5E3A" />
              <View style={styles.targetKgPill}>
                <Text style={styles.targetKgText}>
                  {targetFootprint} kg
                </Text>
              </View>
            </HStack>
          </HStack>
        </View>
      </ScrollView>

      {/* Bottom Action CTA */}
      <Box className="pt-2">
        <Button
          onPress={handleContinue}
          className="w-full h-13 rounded-2xl bg-[#1E5E3A] active:bg-[#16472C]"
          style={styles.ctaShadow}
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-white text-base font-body font-bold">
              See how
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  headerBtnShadow: {
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  glassCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 14,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroScoreContent: {
    alignItems: "center",
    gap: 4,
  },
  sparkleIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroScoreNumber: {
    fontSize: 52,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0B1D12",
    lineHeight: 62,
    paddingVertical: 2,
  },
  heroScoreTag: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#1E5E3A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  heroScoreDesc: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    textAlign: "center",
    lineHeight: 16.5,
    marginTop: 6,
    paddingHorizontal: 6,
  },
  footprintContent: {
    gap: 12,
  },
  footprintHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footprintSmallTag: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#1E5E3A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  footprintBigNumber: {
    fontSize: 28,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0B1D12",
    lineHeight: 36,
  },
  footprintUnit: {
    fontSize: 12.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
  },
  baselinePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(175, 218, 194, 0.75)",
  },
  baselinePillText: {
    fontSize: 11,
    fontFamily: "Nunito_800ExtraBold",
    color: "#165330",
  },
  percentBarContainer: {
    width: "100%",
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: "rgba(210, 232, 220, 0.6)",
  },
  percentBarSegment: {
    height: "100%",
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11.5,
    fontFamily: "Nunito_700Bold",
    color: "#112318",
  },
  homeFootnote: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#6C8A79",
    lineHeight: 15,
  },
  goalCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 14,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  goalTitle: {
    fontSize: 13.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  goalReduction: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#1E5E3A",
    marginTop: 1,
  },
  startingKgPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "#DCEAE0",
  },
  startingKgText: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0B1D12",
  },
  targetKgPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#1E5E3A",
  },
  targetKgText: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#FFFFFF",
  },
  ctaShadow: {
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
});

