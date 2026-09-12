import React from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  ArrowRight,
  Award,
  Leaf,
  RotateCcw,
} from "lucide-react-native";
import { Image } from "react-native";
import { DecorativeBackground } from "@/components/custom/decorative-background";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  function handleSignIn() {
    router.push("/auth/signin" as import("expo-router").Href);
  }

  return (
    <Box
      className="flex-1 bg-background justify-between"
      style={{
        paddingTop: insets.top + 28,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      {/* Background organic circles */}
      <DecorativeBackground />

      {/* Top Header Section */}
      <VStack space="lg">
        <HStack className="items-center justify-between">
          <Image
            source={require("@/assets/karma-text.png")}
            style={{ width: 120, height: 35 }}
            resizeMode="contain"
          />
        </HStack>

        <VStack space="xs" className="mt-4">
          <Heading size="3xl" className="font-heading leading-tight text-foreground">
            Make what you own{"\n"}count for more.
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-2 leading-relaxed font-body">
            Understand your everyday carbon impact. Repair, reuse and recycle before replacing — and earn rewards for the choices you make.
          </Text>
        </VStack>

        {/* Three Value Propositions */}
        <VStack space="sm" className="mt-4">
          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <Activity size={20} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground">
                Track your impact
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                See where your footprint comes from.
              </Text>
            </VStack>
          </Card>

          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <RotateCcw size={20} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground">
                Take circular action
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                Repair, resell and recycle before replacing.
              </Text>
            </VStack>
          </Card>

          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <Award size={20} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground">
                Earn as you improve
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                Unlock rewards through verified actions.
              </Text>
            </VStack>
          </Card>
        </VStack>
      </VStack>

      {/* Bottom CTA Block */}
      <VStack space="sm" className="w-full">
        <Button onPress={handleGetStarted} className="w-full h-13 rounded-2xl">
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-primary-foreground text-base font-body">
              Get started
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>

        <HStack className="justify-center items-center gap-1.5 pt-2">
          <Text size="sm" className="text-muted-foreground font-body">
            Already have an account?
          </Text>
          <Pressable onPress={handleSignIn} hitSlop={8}>
            <Text size="sm" bold className="text-primary font-body">
              Sign in
            </Text>
          </Pressable>
        </HStack>
      </VStack>
    </Box>
  );
}
