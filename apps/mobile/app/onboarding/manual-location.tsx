import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react-native";
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

const LOCATIONS = [
  {
    city: "Bengaluru",
    region: "Karnataka",
    description: "Seeded repair, recycling and reuse options around the city.",
  },
  {
    city: "Ahmedabad",
    region: "Gujarat",
    description: "Browse local circular hubs and verified drop-off partners.",
  },
  {
    city: "Mumbai",
    region: "Maharashtra",
    description: "Find seeded community services across the metro area.",
  },
  {
    city: "Delhi NCR",
    region: "Delhi",
    description: "See nearby reuse, repair and recycling possibilities.",
  },
] as const;

export default function ManualLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setManualLocation = useAuthStore((state) => state.setManualLocation);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const currentLocation = useAuthStore((state) => state.manualLocation);
  const [selectedLocation, setSelectedLocation] = useState(currentLocation ?? "");

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding/location");
    }
  }

  function handleContinue() {
    if (!selectedLocation) return;
    setManualLocation(selectedLocation);
    completeOnboarding();
    router.replace("/(tabs)");
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

      <HStack className="items-center justify-between mb-5">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-card items-center justify-center border border-border"
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color="rgb(28,42,36)" />
        </Pressable>
        <Text size="xs" bold className="text-muted-foreground font-mono uppercase tracking-wider">
          Your area
        </Text>
        <Box className="w-10 h-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="xs">
          <Box className="w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-1">
            <MapPin size={26} color="rgb(46,168,110)" />
          </Box>
          <Heading size="2xl" className="font-heading text-foreground">
            Choose your location
          </Heading>
          <Text size="sm" className="text-muted-foreground leading-relaxed font-body">
            Pick the city you want to use for nearby circular options. We only use seeded locations in this demo.
          </Text>
        </VStack>

        <VStack space="sm">
          {LOCATIONS.map((location) => {
            const value = `${location.city}, ${location.region}`;
            const isSelected = selectedLocation === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSelectedLocation(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Card
                  variant={isSelected ? "softPop" : "soft"}
                  className={`p-4 border ${isSelected ? "border-primary" : "border-border/60"}`}
                >
                  <HStack className="items-center gap-3">
                    <Box className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
                      <MapPin size={19} color="rgb(46,168,110)" />
                    </Box>
                    <VStack className="flex-1 min-w-0">
                      <Text bold size="md" className="text-foreground font-heading">
                        {location.city}
                      </Text>
                      <Text size="xs" className="text-primary font-mono">
                        {location.region}
                      </Text>
                      <Text size="xs" className="text-muted-foreground leading-relaxed font-body mt-0.5">
                        {location.description}
                      </Text>
                    </VStack>
                    <Box
                      className={`w-7 h-7 rounded-full items-center justify-center border ${isSelected ? "bg-primary border-primary" : "bg-card border-border"}`}
                    >
                      {isSelected ? <Check size={16} color="white" /> : null}
                    </Box>
                  </HStack>
                </Card>
              </Pressable>
            );
          })}
        </VStack>
      </ScrollView>

      <VStack space="sm" className="pt-2">
        <Button onPress={handleContinue} disabled={!selectedLocation} className="w-full h-13 rounded-2xl">
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-primary-foreground text-base font-body">
              Use this location
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
        <Text size="2xs" className="text-muted-foreground text-center font-body">
          You can change this later from settings.
        </Text>
      </VStack>
    </Box>
  );
}
