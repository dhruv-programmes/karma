import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Sparkles,
  TrendingDown,
  Wrench,
} from "lucide-react-native";
import { DecorativeBackground } from "@/components/custom/decorative-background";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
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
  const startingFootprint = computed.totalKg; // e.g. 74
  const targetFootprint = Math.round(startingFootprint * (1 - reductionPct / 100)); // e.g. 63
  const startingScore = computed.score; // e.g. 642

  // Category breakdown percentages
  const transportPct = Math.round((computed.transportKg / startingFootprint) * 100); // ~32%
  const shoppingPct = Math.round((computed.shoppingKg / startingFootprint) * 100); // ~41%
  const homePct = 100 - transportPct - shoppingPct; // ~27%

  function handleContinue() {
    setOnboardingStep("location");
    router.push("/onboarding/location" as import("expo-router").Href);
  }

  return (
    <Box
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      <DecorativeBackground />

      {/* Top Bar */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>

        <Box className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Text size="xs" bold className="text-primary font-mono uppercase">
            Baseline Estimate
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-foreground">
            Your starting point
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-0.5 leading-relaxed font-body">
            Based on what you've told us
          </Text>
        </VStack>

        {/* Hero Score Card */}
        <Card variant="soft" className="p-5 items-center border border-primary/25 bg-card gap-2 shadow-sm">
          <Box className="w-12 h-12 rounded-full bg-primary/15 items-center justify-center mb-1">
            <Sparkles size={22} color="rgb(46,168,110)" />
          </Box>
          <Text size="5xl" bold className="text-foreground font-mono leading-none">
            {startingScore}
          </Text>
          <Text size="xs" bold className="text-primary tracking-widest uppercase font-mono mt-1">
            Carbon Score
          </Text>
          <Text size="xs" className="text-muted-foreground font-body text-center mt-1 px-4">
            Estimated initial score on the 0–850 index. Sharper precision unlocks as you log verified circular actions and receipts.
          </Text>
        </Card>

        {/* Estimated Footprint & Breakdown */}
        <Card variant="outline" className="p-4 gap-3 border-border">
          <HStack className="items-center justify-between">
            <VStack>
              <Text size="xs" className="text-muted-foreground font-body uppercase tracking-wider">
                Estimated Footprint
              </Text>
              <HStack className="items-baseline gap-1 mt-0.5">
                <Text size="2xl" bold className="text-foreground font-mono">
                  {startingFootprint}
                </Text>
                <Text size="xs" className="text-muted-foreground font-body">
                  kg CO₂e / month
                </Text>
              </HStack>
            </VStack>
            <Box className="px-2.5 py-1 rounded-md bg-secondary">
              <Text size="xs" className="text-secondary-foreground font-mono">
                Baseline
              </Text>
            </Box>
          </HStack>

          {/* Visual Percentage Bar */}
          <Box className="w-full h-3 rounded-full overflow-hidden flex-row bg-secondary/80 mt-1">
            <Box style={{ width: `${transportPct}%` }} className="h-full bg-primary" />
            <Box style={{ width: `${shoppingPct}%` }} className="h-full bg-emerald-600" />
            <Box style={{ width: `${homePct}%` }} className="h-full bg-emerald-900/30" />
          </Box>

          <HStack className="justify-between items-center pt-1 flex-wrap gap-y-2 gap-x-3">
            <HStack className="items-center gap-1.5 shrink min-w-0">
              <Box className="w-2.5 h-2.5 rounded-full bg-primary" />
              <Text size="xs" numberOfLines={1} className="text-foreground font-mono">
                Transport {transportPct}%
              </Text>
            </HStack>
            <HStack className="items-center gap-1.5 shrink min-w-0">
              <Box className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <Text size="xs" numberOfLines={1} className="text-foreground font-mono">
                Shopping {shoppingPct}%
              </Text>
            </HStack>
            <HStack className="items-center gap-1.5 shrink min-w-0">
              <Box className="w-2.5 h-2.5 rounded-full bg-emerald-900/30" />
              <Text size="xs" numberOfLines={1} className="text-foreground font-mono">
                Home {homePct}%*
              </Text>
            </HStack>
          </HStack>

          <Text size="2xs" className="text-muted-foreground font-body mt-0.5">
            *Home energy is an estimated initial baseline until utility bills or energy data are connected.
          </Text>
        </Card>

        {/* Goal Transition Visual */}
        <Card variant="soft" className="p-4 gap-3 bg-secondary/60 border border-border">
          <HStack className="items-center justify-between">
            <VStack>
              <Text size="xs" bold className="text-foreground font-body">
                Your 1st Month Goal
              </Text>
              <Text size="xs" className="text-primary font-mono font-bold">
                −{reductionPct}% reduction
              </Text>
            </VStack>

            <HStack className="items-center gap-2">
              <Box className="px-2.5 py-1 rounded-lg bg-card border border-border">
                <Text size="xs" bold className="text-foreground font-mono">
                  {startingFootprint} kg
                </Text>
              </Box>
              <ArrowRight size={14} color="rgb(46,168,110)" />
              <Box className="px-2.5 py-1 rounded-lg bg-primary">
                <Text size="xs" bold className="text-primary-foreground font-mono">
                  {targetFootprint} kg
                </Text>
              </Box>
            </HStack>
          </HStack>
        </Card>

        {/* Easiest First Action Recommendation */}
        <Card variant="softPop" className="p-4 gap-3 border border-primary/30">
          <HStack className="items-center justify-between gap-2">
            <Text
              size="2xs"
              bold
              numberOfLines={1}
              className="flex-1 min-w-0 shrink text-primary tracking-widest uppercase font-mono"
            >
              Your easiest first action
            </Text>
            <Box className="px-2 py-0.5 rounded-full bg-primary/15 shrink-0">
              <Text size="2xs" bold numberOfLines={1} className="text-primary font-mono">
                −4.2 kg CO₂e
              </Text>
            </Box>
          </HStack>

          <HStack className="items-center gap-3">
            <Box className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
              <Wrench size={20} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1 min-w-0">
              <Text bold size="md" numberOfLines={1} className="text-foreground font-heading">
                Repair before replacing
              </Text>
              <Text size="xs" numberOfLines={2} className="text-muted-foreground font-body">
                Fixing an everyday device keeps ~4.2 to 120 kg CO₂e out of the atmosphere.
              </Text>
            </VStack>
          </HStack>
        </Card>
      </ScrollView>

      {/* Bottom Action */}
      <Box className="pt-2">
        <Button onPress={handleContinue} className="w-full h-13 rounded-2xl">
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-primary-foreground text-base font-body">
              See how
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
      </Box>
    </Box>
  );
}
