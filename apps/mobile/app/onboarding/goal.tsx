import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  RotateCcw,
  Sparkles,
  TrendingDown,
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

  function handleContinue() {
    setGoal({ reductionPct, priorities: selectedPriorities });
    setOnboardingStep("reveal");
    router.push("/onboarding/reveal" as import("expo-router").Href);
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

      {/* Top Navigation & Progress */}
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
            Step 2 of 2
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      {/* Progress Line */}
      <Box className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-5">
        <Box className="w-full h-full bg-primary rounded-full" />
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-foreground">
            Set your goal
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-1 leading-relaxed font-body">
            Choose how much you want to improve over your first month.
          </Text>
        </VStack>

        {/* Hero Goal Card */}
        <Card variant="soft" className="p-5 border border-primary/25 bg-card gap-4">
          <HStack className="items-center justify-between gap-3">
            <VStack className="flex-1 min-w-0">
              <Text size="xs" bold numberOfLines={1} className="text-primary tracking-widest uppercase font-mono">
                Monthly footprint reduction
              </Text>
              <HStack className="items-baseline gap-2 mt-1 flex-wrap">
                <Text size="4xl" bold className="text-foreground font-mono">
                  {reductionPct}%
                </Text>
                <Text size="sm" numberOfLines={1} className="shrink text-muted-foreground font-body">
                  Estimated reduction
                </Text>
              </HStack>
            </VStack>
            <Box className="w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center">
              <Sparkles size={22} color="rgb(46,168,110)" />
            </Box>
          </HStack>

          {/* Stepped Increment Slider Chips */}
          <VStack space="xs" className="mt-1">
            <HStack className="justify-between items-center gap-1.5 flex-wrap">
              {REDUCTION_STEPS.map((step) => {
                const isSelected = reductionPct === step;
                return (
                  <Pressable
                    key={step}
                    onPress={() => setReductionPct(step)}
                    className={`flex-1 min-w-[44px] py-2.5 px-1 rounded-xl items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-secondary/70 border-border/80 active:bg-secondary"
                    }`}
                  >
                    <Text
                      size="xs"
                      bold
                      numberOfLines={1}
                      className={`font-mono ${
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {step}%
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>

          <Text size="xs" className="text-muted-foreground font-body leading-relaxed pt-1">
            We'll recommend actions based on your goal and current habits.
          </Text>
        </Card>

        {/* WHAT MATTERS MOST */}
        <VStack space="sm">
          <Text bold size="sm" className="text-foreground font-body">
            What matters most to you?
          </Text>
          <Text size="xs" className="text-muted-foreground font-body -mt-1">
            Select 1 or 2 priorities to tailor your recommendations.
          </Text>

          <VStack space="xs" className="mt-1">
            {MATTERS_MOST_OPTIONS.map((item) => {
              const isSelected = selectedPriorities.includes(item.id);
              const IconComp = item.Icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => togglePriority(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-card border-primary"
                      : "bg-card/70 border-border/70 active:bg-card"
                  }`}
                >
                  <HStack className="items-center justify-between">
                    <HStack className="items-center gap-3 flex-1">
                      <Box
                        className={`w-10 h-10 rounded-xl items-center justify-center ${
                          isSelected ? "bg-primary/15" : "bg-secondary"
                        }`}
                      >
                        <IconComp
                          size={18}
                          color={isSelected ? "rgb(46,168,110)" : "rgb(100,120,110)"}
                        />
                      </Box>
                      <VStack className="flex-1">
                        <Text bold size="sm" className="text-foreground font-body">
                          {item.title}
                        </Text>
                        <Text size="xs" className="text-muted-foreground font-body">
                          {item.desc}
                        </Text>
                      </VStack>
                    </HStack>

                    <Box
                      className={`w-6 h-6 rounded-full items-center justify-center border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      {isSelected ? <Check size={14} color="white" /> : null}
                    </Box>
                  </HStack>
                </Pressable>
              );
            })}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom CTA */}
      <Box className="pt-2">
        <Button onPress={handleContinue} className="w-full h-13 rounded-2xl">
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-primary-foreground text-base font-body">
              Reveal starting point
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
      </Box>
    </Box>
  );
}
