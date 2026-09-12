import React from "react";
import { Image, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuthStore } from "@/src/store/auth";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  function handleGetStarted() {
    setOnboardingStep("account");
    router.push("/onboarding/account" as import("expo-router").Href);
  }

  return (
    <Box className="flex-1" style={{ backgroundColor: "#F4F8F5" }}>
      {/* 1. Full-Screen Botanical Background */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Image
          source={require("@/assets/carbon-loop-welcome-bg.jpg")}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      </View>

      {/* 2. Main Content Container */}
      <Box
        className="flex-1 justify-between"
        style={{
          paddingTop: Math.max(insets.top + 8, 24),
          paddingBottom: Math.max(insets.bottom + 8, 20),
          paddingHorizontal: 22,
        }}
      >
        {/* Top Header Section (Logo and Heading Centered, No Subtext) */}
        <VStack space="sm" className="items-center">
          <Image
            source={require("@/assets/karma-text.png")}
            style={{ width: 120, height: 38 }}
            resizeMode="contain"
          />

          <Heading
            size="3xl"
            className="font-heading leading-tight text-[#112318] text-[31px] text-center mt-2.5"
          >
            Make what you own{"\n"}count for more.
          </Heading>
        </VStack>

          {/* Three Value Propositions (Styled exactly to match target design) */}
          <VStack space="md" className="mt-3">
            {/* 1. Track your impact */}
            <Box
              className="flex-row items-center gap-4 px-5 py-4 rounded-[26px] bg-white border border-[#E1EDE4]"
              style={{
                shadowColor: "#184A2C",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Image
                source={require("@/assets/onboarding/icon-impact.png")}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
              <VStack className="flex-1">
                <Text bold className="text-[#0E2015] font-body text-[17px] tracking-tight">
                  Track your impact
                </Text>
                <Text className="text-[#556E60] font-body text-[13.5px] mt-0.5 leading-snug">
                  See where your footprint comes from.
                </Text>
              </VStack>
            </Box>

            {/* 2. Take circular action */}
            <Box
              className="flex-row items-center gap-4 px-5 py-4 rounded-[26px] bg-white border border-[#E1EDE4]"
              style={{
                shadowColor: "#184A2C",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Image
                source={require("@/assets/onboarding/icon-circular.png")}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
              <VStack className="flex-1">
                <Text bold className="text-[#0E2015] font-body text-[17px] tracking-tight">
                  Take circular action
                </Text>
                <Text className="text-[#556E60] font-body text-[13.5px] mt-0.5 leading-snug">
                  Repair, resell and recycle before replacing.
                </Text>
              </VStack>
            </Box>

            {/* 3. Earn as you improve */}
            <Box
              className="flex-row items-center gap-4 px-5 py-4 rounded-[26px] bg-white border border-[#E1EDE4]"
              style={{
                shadowColor: "#184A2C",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Image
                source={require("@/assets/onboarding/icon-rewards.png")}
                style={{ width: 52, height: 52 }}
                resizeMode="contain"
              />
              <VStack className="flex-1">
                <Text bold className="text-[#0E2015] font-body text-[17px] tracking-tight">
                  Earn as you improve
                </Text>
                <Text className="text-[#556E60] font-body text-[13.5px] mt-0.5 leading-snug">
                  Unlock rewards through verified actions.
                </Text>
              </VStack>
            </Box>
          </VStack>

        {/* Bottom CTA Block (Only Get Started, No Sign In) */}
        <VStack space="sm" className="w-full mt-4">
          <Pressable
            onPress={handleGetStarted}
            className="w-full h-14 rounded-2xl bg-[#184A2C] flex-row items-center justify-center gap-2.5 px-4 active:bg-[#123821]"
            style={{
              shadowColor: "#184A2C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.22,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text bold size="md" className="text-white font-body text-[16px] tracking-wide">
              Get started
            </Text>
            <ArrowRight size={19} color="white" />
          </Pressable>

          {/* Subtle Footer Links */}
          <HStack className="items-center justify-center gap-2 pt-2">
            <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
              <Text className="text-[#7D9185] font-body text-[11.5px]">Privacy</Text>
            </Pressable>
            <Text className="text-[#7D9185] text-[11.5px]">•</Text>
            <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
              <Text className="text-[#7D9185] font-body text-[11.5px]">Terms</Text>
            </Pressable>
            <Text className="text-[#7D9185] text-[11.5px]">•</Text>
            <Pressable onPress={() => {}} hitSlop={8} className="active:opacity-70">
              <Text className="text-[#7D9185] font-body text-[11.5px]">Help</Text>
            </Pressable>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}
