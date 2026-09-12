import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Car,
  Package,
  RotateCcw,
  ShoppingBag,
  Zap,
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
import {
  DEFAULT_BASELINE,
  type Frequency,
  type ShoppingFrequencies,
  type TransportFrequencies,
  useAuthStore,
} from "@/src/store/auth";

const FREQUENCY_OPTIONS: { id: Frequency; label: string }[] = [
  { id: "never", label: "Never" },
  { id: "rarely", label: "Rarely" },
  { id: "sometimes", label: "Some" },
  { id: "often", label: "Often" },
];

const TRANSPORT_ITEMS = [
  {
    key: "public" as keyof TransportFrequencies,
    title: "Public transport",
    desc: "Metro, bus or train",
    Icon: Bus,
  },
  {
    key: "twowheeler" as keyof TransportFrequencies,
    title: "Two-wheeler",
    desc: "Motorbike or scooter",
    Icon: Zap,
  },
  {
    key: "car" as keyof TransportFrequencies,
    title: "Car / Cab",
    desc: "Personal car or ride-hailing",
    Icon: Car,
  },
  {
    key: "walk" as keyof TransportFrequencies,
    title: "Walk / Cycle",
    desc: "Zero direct emissions",
    Icon: Bike,
  },
];

const SHOPPING_ITEMS = [
  {
    key: "repair" as keyof ShoppingFrequencies,
    title: "Repair & reuse",
    desc: "Fixing or keeping gear longer",
    Icon: RotateCcw,
  },
  {
    key: "selective" as keyof ShoppingFrequencies,
    title: "Selective buyer",
    desc: "Buying durable goods when needed",
    Icon: ShoppingBag,
  },
  {
    key: "frequent" as keyof ShoppingFrequencies,
    title: "Frequent purchases",
    desc: "Regular new deliveries & fast retail",
    Icon: Package,
  },
];

export default function BaselineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const storedBaseline = useAuthStore((s) => s.baseline);
  const setBaseline = useAuthStore((s) => s.setBaseline);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [transport, setTransport] = useState<TransportFrequencies>(
    storedBaseline?.transport || DEFAULT_BASELINE.transport
  );
  const [shopping, setShopping] = useState<ShoppingFrequencies>(
    storedBaseline?.shopping || DEFAULT_BASELINE.shopping
  );

  function updateTransport(key: keyof TransportFrequencies, freq: Frequency) {
    setTransport((prev) => ({ ...prev, [key]: freq }));
  }

  function updateShopping(key: keyof ShoppingFrequencies, freq: Frequency) {
    setShopping((prev) => ({ ...prev, [key]: freq }));
  }

  function handleContinue() {
    setBaseline({ transport, shopping });
    setOnboardingStep("goal");
    router.push("/onboarding/goal" as import("expo-router").Href);
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

      {/* Navigation & Progress Header */}
      <HStack className="items-center justify-between mb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>

        <Box className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Text size="xs" bold className="text-primary font-mono uppercase">
            Step 1 of 2
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      {/* Progress Line */}
      <Box className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-4">
        <Box className="w-1/2 h-full bg-primary rounded-full" />
      </Box>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-foreground">
            Tell us a little about your routine
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-0.5 leading-relaxed font-body">
            Select how often you use each option. You can update this anytime.
          </Text>
        </VStack>

        {/* SECTION 1: HOW DO YOU GET AROUND */}
        <VStack space="sm" className="mt-1">
          <Text bold size="sm" className="text-foreground font-heading">
            How do you usually get around?
          </Text>

          <VStack space="sm">
            {TRANSPORT_ITEMS.map((item) => {
              const currentFreq = transport[item.key];
              const IconComp = item.Icon;
              return (
                <Card
                  key={item.key}
                  variant="outline"
                  className="p-3.5 gap-3 border-border bg-card"
                >
                  <HStack className="items-center gap-3">
                    <Box className="w-10 h-10 rounded-xl bg-secondary items-center justify-center">
                      <IconComp size={18} color="rgb(46,168,110)" />
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

                  {/* Frequency Pills */}
                  <HStack className="gap-1.5 pt-1 flex-wrap">
                    {FREQUENCY_OPTIONS.map((opt) => {
                      const isSelected = currentFreq === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => updateTransport(item.key, opt.id)}
                          className={`flex-1 min-w-[64px] py-1.5 px-1 rounded-xl items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-secondary/70 border-border/70 active:bg-secondary"
                          }`}
                        >
                          <Text
                            size="2xs"
                            bold={isSelected}
                            numberOfLines={1}
                            className={`font-body ${
                              isSelected ? "text-primary-foreground font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </Card>
              );
            })}
          </VStack>
        </VStack>

        {/* SECTION 2: SHOPPING & LIFESTYLE */}
        <VStack space="sm" className="mt-2">
          <Text bold size="sm" className="text-foreground font-heading">
            What best describes your shopping?
          </Text>

          <VStack space="sm">
            {SHOPPING_ITEMS.map((item) => {
              const currentFreq = shopping[item.key];
              const IconComp = item.Icon;
              return (
                <Card
                  key={item.key}
                  variant="outline"
                  className="p-3.5 gap-3 border-border bg-card"
                >
                  <HStack className="items-center gap-3">
                    <Box className="w-10 h-10 rounded-xl bg-secondary items-center justify-center">
                      <IconComp size={18} color="rgb(46,168,110)" />
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

                  {/* Frequency Pills */}
                  <HStack className="gap-1.5 pt-1 flex-wrap">
                    {FREQUENCY_OPTIONS.map((opt) => {
                      const isSelected = currentFreq === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => updateShopping(item.key, opt.id)}
                          className={`flex-1 min-w-[64px] py-1.5 px-1 rounded-xl items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-secondary/70 border-border/70 active:bg-secondary"
                          }`}
                        >
                          <Text
                            size="2xs"
                            bold={isSelected}
                            numberOfLines={1}
                            className={`font-body ${
                              isSelected ? "text-primary-foreground font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </Card>
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
              Continue
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
      </Box>
    </Box>
  );
}
