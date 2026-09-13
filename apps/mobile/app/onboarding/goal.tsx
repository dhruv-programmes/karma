import React, { useState } from "react";
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
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  RotateCcw,
  Sparkles,
  TrendingDown,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuthStore } from "@/src/store/auth";

const REDUCTION_STEPS = [5, 10, 15, 20, 25, 30];

const MATTERS_MOST_OPTIONS = [
  {
    id: "emissions",
    title: "Reduce emissions",
    desc: "Lower my everyday footprint.",
    Icon: TrendingDown,
  },
  {
    id: "circular",
    title: "Live more circularly",
    desc: "Repair, reuse and recycle more.",
    Icon: RotateCcw,
  },
  {
    id: "rewards",
    title: "Earn rewards",
    desc: "Unlock better rewards through my actions.",
    Icon: Award,
  },
];

export default function GoalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const storedGoal = useAuthStore((s) => s.goal);
  const setGoal = useAuthStore((s) => s.setGoal);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [reductionPct, setReductionPct] = useState<number>(storedGoal?.reductionPct ?? 15);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    storedGoal?.priorities && storedGoal.priorities.length > 0
      ? storedGoal.priorities
      : ["emissions"]
  );

  function togglePriority(id: string) {
    Haptics.selectionAsync().catch(() => {});
    if (selectedPriorities.includes(id)) {
      if (selectedPriorities.length > 1) {
        setSelectedPriorities(selectedPriorities.filter((p) => p !== id));
      }
    } else {
      if (selectedPriorities.length < 2) {
        setSelectedPriorities([...selectedPriorities, id]);
      } else {
        setSelectedPriorities([selectedPriorities[1], id]);
      }
    }
  }

  function handleSelectStep(step: number) {
    setReductionPct(step);
    Haptics.selectionAsync().catch(() => {});
  }

  function handleContinue() {
    setGoal({ reductionPct, priorities: selectedPriorities });
    setOnboardingStep("reveal");
    router.push("/onboarding/reveal" as import("expo-router").Href);
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

      {/* Top Navigation & Progress Header */}
      <HStack className="items-center justify-between mb-3">
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
            Step 2 of 2
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      {/* Progress Line */}
      <Box className="w-full h-1.5 bg-[#DCEAE0] rounded-full overflow-hidden mb-4">
        <Box className="w-full h-full bg-[#2EA86E] rounded-full" />
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-[#112318] text-[28px] leading-tight">
            Set your goal
          </Heading>
          <Text size="sm" className="text-[#527060] mt-1 leading-relaxed font-body">
            Choose how much you want to improve over your first month.
          </Text>
        </VStack>

        {/* Hero Goal Card with Glassmorphism */}
        <View style={styles.glassCard}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.84)", "rgba(255, 255, 255, 0.64)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroCardContent}>
            <View style={styles.heroCardTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.badgeLabel}>
                  Monthly footprint reduction
                </Text>
                <HStack className="items-baseline gap-2 mt-1">
                  <Text style={styles.reductionPctText}>
                    {reductionPct}%
                  </Text>
                  <Text style={styles.reductionSubText}>
                    Estimated reduction
                  </Text>
                </HStack>
              </View>

              <View style={styles.sparkleBox}>
                <Sparkles size={20} color="#1E5E3A" />
              </View>
            </View>

            {/* Stepped Increment Chips */}
            <View style={styles.chipsRow}>
              {REDUCTION_STEPS.map((step) => {
                const isSelected = reductionPct === step;
                return (
                  <Pressable
                    key={step}
                    onPress={() => handleSelectStep(step)}
                    style={[
                      styles.chipBtn,
                      isSelected ? styles.chipBtnSelected : styles.chipBtnUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                      ]}
                    >
                      {step}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.cardFootnote}>
              We'll recommend actions based on your goal and current habits.
            </Text>
          </View>
        </View>

        {/* WHAT MATTERS MOST SECTION */}
        <VStack space="sm" className="mt-1">
          <Text bold size="sm" className="text-[#112318] font-heading text-[16px]">
            What matters most to you?
          </Text>
          <Text size="xs" className="text-[#527060] font-body -mt-1">
            Select 1 or 2 priorities to tailor your recommendations.
          </Text>

          <VStack space="sm" className="mt-1">
            {MATTERS_MOST_OPTIONS.map((item) => {
              const isSelected = selectedPriorities.includes(item.id);
              const IconComp = item.Icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => togglePriority(item.id)}
                  style={[
                    styles.priorityCard,
                    isSelected && styles.priorityCardSelected,
                  ]}
                >
                  <LinearGradient
                    colors={
                      isSelected
                        ? ["rgba(238, 252, 244, 0.92)", "rgba(230, 248, 238, 0.82)"]
                        : ["rgba(255, 255, 255, 0.82)", "rgba(255, 255, 255, 0.64)"]
                    }
                    style={StyleSheet.absoluteFill}
                  />

                  <HStack className="items-center justify-between">
                    <HStack className="items-center gap-3 flex-1 min-w-0 pr-2">
                      <View
                        style={[
                          styles.priorityIconBox,
                          isSelected && styles.priorityIconBoxSelected,
                        ]}
                      >
                        <IconComp size={18} color="#1E5E3A" />
                      </View>
                      <VStack className="flex-1 min-w-0">
                        <Text style={styles.priorityTitle}>
                          {item.title}
                        </Text>
                        <Text style={styles.priorityDesc}>
                          {item.desc}
                        </Text>
                      </VStack>
                    </HStack>

                    <View
                      style={[
                        styles.checkCircle,
                        isSelected ? styles.checkCircleSelected : styles.checkCircleUnselected,
                      ]}
                    >
                      {isSelected ? <Check size={13} color="#FFFFFF" strokeWidth={2.8} /> : null}
                    </View>
                  </HStack>
                </Pressable>
              );
            })}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom CTA */}
      <Box className="pt-2">
        <Button
          onPress={handleContinue}
          className="w-full h-13 rounded-2xl bg-[#1E5E3A] active:bg-[#16472C]"
          style={styles.ctaShadow}
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-white text-base font-body font-bold">
              Reveal starting point
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
    padding: 16,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCardContent: {
    gap: 14,
  },
  heroCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#1E5E3A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  reductionPctText: {
    fontSize: 34,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0B1D12",
    lineHeight: 42,
  },
  reductionSubText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
  },
  sparkleBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  chipBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipBtnSelected: {
    backgroundColor: "#2EA86E",
    borderColor: "#2EA86E",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  chipBtnUnselected: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(205, 224, 214, 0.85)",
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
  },
  chipTextUnselected: {
    color: "#165330",
  },
  cardFootnote: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    lineHeight: 17,
  },
  priorityCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 13,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  priorityCardSelected: {
    borderColor: "rgba(46, 168, 110, 0.6)",
  },
  priorityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(230, 246, 237, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityIconBoxSelected: {
    backgroundColor: "#E2F4EA",
    borderColor: "#BDE3CC",
  },
  priorityTitle: {
    fontSize: 14.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  priorityDesc: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    marginTop: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  checkCircleSelected: {
    backgroundColor: "#2EA86E",
    borderColor: "#2EA86E",
  },
  checkCircleUnselected: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: "rgba(185, 212, 198, 0.9)",
  },
  ctaShadow: {
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
});

