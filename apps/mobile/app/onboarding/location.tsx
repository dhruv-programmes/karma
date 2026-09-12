import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
  MapPin,
  Recycle,
  Wrench,
} from "lucide-react-native";
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

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setLocationPreference = useAuthStore((s) => s.setLocationPreference);

  const [requesting, setRequesting] = useState(false);

  async function handleRequestLocation() {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPreference(status === "granted" ? "granted" : "denied");
    } catch {
      setLocationPreference("denied");
    } finally {
      setRequesting(false);
      completeOnboarding();
      router.replace("/(tabs)");
    }
  }

  function handleSkip() {
    setLocationPreference("manual");
    completeOnboarding();
    router.replace("/(tabs)");
  }

  function handleManualSelection() {
    router.push("/onboarding/manual-location" as import("expo-router").Href);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding");
    }
  }

  return (
    <Box
      className="flex-1 bg-background justify-between"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <DecorativeBackground />

      {/* Top Navigation */}
      <HStack className="items-center justify-between mb-2">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>

        <Pressable onPress={handleSkip} hitSlop={8}>
          <Text size="xs" bold className="text-muted-foreground font-body">
            Not now
          </Text>
        </Pressable>
      </HStack>

      {/* Main Content */}
      <VStack space="lg">
        <Box className="w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center">
          <MapPin size={26} color="rgb(46,168,110)" />
        </Box>

        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-foreground">
            Find circular options near you
          </Heading>
          <Text size="sm" className="text-muted-foreground mt-1 leading-relaxed font-body">
            Your next action can be local. We'll help you find nearby verified services so taking circular action is effortless.
          </Text>
        </VStack>

        <VStack space="sm" className="mt-2">
          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <Wrench size={18} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground font-body">
                Repair partners
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                Certified device and appliance workshops.
              </Text>
            </VStack>
          </Card>

          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <Recycle size={18} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground font-body">
                Recycling facilities
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                Responsible e-waste and material drop centers.
              </Text>
            </VStack>
          </Card>

          <Card variant="soft" className="flex-row items-center gap-3.5 p-4 border border-border/50">
            <Box className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <HeartHandshake size={18} color="rgb(46,168,110)" />
            </Box>
            <VStack className="flex-1">
              <Text bold size="sm" className="text-foreground font-body">
                Donation hubs
              </Text>
              <Text size="xs" className="text-muted-foreground font-body">
                Verified community re-circulation hubs.
              </Text>
            </VStack>
          </Card>
        </VStack>
      </VStack>

      {/* Bottom CTA Block */}
      <VStack space="sm" className="w-full">
        <Button
          onPress={handleRequestLocation}
          disabled={requesting}
          className="w-full h-13 rounded-2xl"
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-primary-foreground text-base font-body">
              {requesting ? "Requesting..." : "Use my location"}
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>

        <Pressable
          onPress={handleManualSelection}
          className="w-full h-12 rounded-2xl items-center justify-center"
        >
          <Text size="sm" bold className="text-muted-foreground font-body">
            Choose location manually
          </Text>
        </Pressable>
      </VStack>
    </Box>
  );
}
