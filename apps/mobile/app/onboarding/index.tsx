import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Flame,
  Layers,
  Leaf,
  MapPin,
  Recycle,
  Sparkles,
  Wrench,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppStore } from "@/src/store/app";

const COMMUTE_MODES = [
  { id: "transit", title: "Metro & BMTC Buses", kg: 15, icon: "🚇", desc: "Low carbon daily transit" },
  { id: "ev", title: "EV / Two-Wheeler", kg: 28, icon: "🛵", desc: "Moderate urban commutes" },
  { id: "car", title: "Daily Cabs & Car", kg: 65, icon: "🚗", desc: "High fuel impact hotspot" },
];

const SHOPPING_HABITS = [
  { id: "repair", title: "Repair & Secondhand First", kg: 18, icon: "🛠️", desc: "Keep gear in use longer" },
  { id: "conscious", title: "Conscious Selective Buyer", kg: 34, icon: "🌿", desc: "Balanced durable goods" },
  { id: "quick", title: "Frequent Quick Commerce", kg: 68, icon: "⚡", desc: "Heavy packaging & deliveries" },
];

const LOCAL_HUBS = [
  { name: "Koramangala Phone Clinic", type: "Repair Hub", dist: "1.2 km", verified: true },
  { name: "Saahas Zero Waste Hub", type: "Recycling Station", dist: "2.5 km", verified: true },
  { name: "Goonj Collection Point", type: "Textile Donation", dist: "3.1 km", verified: true },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setDone = useAppStore((s) => s.setOnboardingDone);

  const [step, setStep] = useState(0);
  const [commuteId, setCommuteId] = useState("transit");
  const [shoppingId, setShoppingId] = useState("conscious");

  const commuteKg = COMMUTE_MODES.find((m) => m.id === commuteId)?.kg ?? 20;
  const shoppingKg = SHOPPING_HABITS.find((s) => s.id === shoppingId)?.kg ?? 34;
  const estimatedBaseline = commuteKg + shoppingKg + 25; // +25 home energy baseline

  function completeAsDemo() {
    setDone(true);
    router.replace("/(tabs)");
  }

  function goToSignIn() {
    router.push("/auth/signin" as import("expo-router").Href);
  }

  function goToSignUp() {
    router.push("/auth/signup" as import("expo-router").Href);
  }

  return (
    <Box
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}
    >
      {/* Background ambient accents */}
      <Box className="absolute -top-12 -right-16 w-64 h-64 rounded-full bg-accent/20" />
      <Box className="absolute top-64 -left-24 w-52 h-52 rounded-full bg-primary/15" />

      {/* Top Header & Step Progress Bar */}
      <Box className="px-6 pb-3">
        <HStack className="items-center justify-between mb-3">
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              className="w-9 h-9 rounded-full bg-card items-center justify-center border border-border"
            >
              <ArrowLeft size={18} color="rgb(28,42,36)" />
            </Pressable>
          ) : (
            <Box className="w-9 h-9" />
          )}
          <HStack className="items-center gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <Box
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step
                    ? "w-7 bg-primary"
                    : idx < step
                    ? "w-2.5 bg-primary/50"
                    : "w-2.5 bg-border"
                }`}
              />
            ))}
          </HStack>
          <Pressable onPress={completeAsDemo}>
            <Text size="xs" bold className="text-muted-foreground">
              Skip
            </Text>
          </Pressable>
        </HStack>
      </Box>

      {/* Main Content Pages */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 0: THE LOOP PHILOSOPHY */}
        {step === 0 && (
          <VStack space="lg">
            <Box className="w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center">
              <Leaf size={24} color="rgb(46,168,110)" />
            </Box>
            <VStack space="xs">
              <Text size="xs" bold className="text-primary tracking-wider uppercase">
                Carbon Loop
              </Text>
              <Heading size="3xl" className="leading-tight">
                Close the loop on stuff you already own.
              </Heading>
              <Text size="sm" className="text-muted-foreground mt-2 leading-relaxed">
                Most footprint apps just guess or demand drastic sacrifices. Carbon Loop helps you extend product lifespans, repair broken electronics, and avoid tons of real carbon right here in your city.
              </Text>
            </VStack>

            <VStack space="sm" className="mt-2">
              <Card variant="soft" className="flex-row items-center gap-3.5 p-3.5">
                <Box className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
                  <Wrench size={20} color="rgb(46,168,110)" />
                </Box>
                <VStack className="flex-1">
                  <Text bold size="sm">
                    Repair before replacing
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    Save up to ~120 kg CO₂e on a single smartphone fix.
                  </Text>
                </VStack>
              </Card>

              <Card variant="soft" className="flex-row items-center gap-3.5 p-3.5">
                <Box className="w-10 h-10 rounded-xl bg-accent/20 items-center justify-center">
                  <Recycle size={20} color="rgb(255,150,120)" />
                </Box>
                <VStack className="flex-1">
                  <Text bold size="sm">
                    Verified drop-off network
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    Map verified repair cafes, e-waste centers, and donation hubs.
                  </Text>
                </VStack>
              </Card>

              <Card variant="soft" className="flex-row items-center gap-3.5 p-3.5">
                <Box className="w-10 h-10 rounded-xl bg-secondary items-center justify-center">
                  <Flame size={20} color="rgb(46,168,110)" />
                </Box>
                <VStack className="flex-1">
                  <Text bold size="sm">
                    Streaks & real partner rewards
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    Turn circular habits into points, vouchers, and verified offsets.
                  </Text>
                </VStack>
              </Card>
            </VStack>
          </VStack>
        )}

        {/* STEP 1: INTERACTIVE BASELINE CALCULATION */}
        {step === 1 && (
          <VStack space="md">
            <VStack space="xs">
              <Text size="xs" bold className="text-primary tracking-wider uppercase">
                Step 1 of 3
              </Text>
              <Heading size="2xl">Your Lifestyle Baseline</Heading>
              <Text size="xs" className="text-muted-foreground">
                Select your everyday patterns to calculate your personalized starting footprint:
              </Text>
            </VStack>

            {/* Commute Selector */}
            <VStack space="xs" className="mt-1">
              <Text size="xs" bold className="text-foreground">
                Daily Commute Mode
              </Text>
              <VStack space="xs">
                {COMMUTE_MODES.map((mode) => {
                  const active = commuteId === mode.id;
                  return (
                    <Pressable
                      key={mode.id}
                      onPress={() => setCommuteId(mode.id)}
                      className={`p-3 rounded-2xl border transition-all ${
                        active
                          ? "bg-card border-primary shadow-sm"
                          : "bg-card/70 border-border/60"
                      }`}
                    >
                      <HStack className="items-center justify-between">
                        <HStack className="items-center gap-2.5 flex-1">
                          <Text size="lg">{mode.icon}</Text>
                          <VStack className="flex-1">
                            <Text bold size="sm">
                              {mode.title}
                            </Text>
                            <Text size="xs" className="text-muted-foreground">
                              {mode.desc}
                            </Text>
                          </VStack>
                        </HStack>
                        <Box className="px-2 py-0.5 rounded-full bg-secondary">
                          <Text size="xs" bold className="text-secondary-foreground font-mono">
                            ~{mode.kg} kg
                          </Text>
                        </Box>
                      </HStack>
                    </Pressable>
                  );
                })}
              </VStack>
            </VStack>

            {/* Shopping Habits */}
            <VStack space="xs" className="mt-1">
              <Text size="xs" bold className="text-foreground">
                Shopping & Goods Style
              </Text>
              <VStack space="xs">
                {SHOPPING_HABITS.map((habit) => {
                  const active = shoppingId === habit.id;
                  return (
                    <Pressable
                      key={habit.id}
                      onPress={() => setShoppingId(habit.id)}
                      className={`p-3 rounded-2xl border transition-all ${
                        active
                          ? "bg-card border-primary shadow-sm"
                          : "bg-card/70 border-border/60"
                      }`}
                    >
                      <HStack className="items-center justify-between">
                        <HStack className="items-center gap-2.5 flex-1">
                          <Text size="lg">{habit.icon}</Text>
                          <VStack className="flex-1">
                            <Text bold size="sm">
                              {habit.title}
                            </Text>
                            <Text size="xs" className="text-muted-foreground">
                              {habit.desc}
                            </Text>
                          </VStack>
                        </HStack>
                        <Box className="px-2 py-0.5 rounded-full bg-secondary">
                          <Text size="xs" bold className="text-secondary-foreground font-mono">
                            ~{habit.kg} kg
                          </Text>
                        </Box>
                      </HStack>
                    </Pressable>
                  );
                })}
              </VStack>
            </VStack>

            {/* Live Interactive Calculation Preview */}
            <Card variant="soft" className="mt-2 bg-primary/10 border border-primary/30 p-4">
              <HStack className="justify-between items-center">
                <VStack>
                  <Text size="xs" bold className="text-primary uppercase tracking-wider">
                    Estimated Monthly Baseline
                  </Text>
                  <HStack className="items-baseline gap-1.5 mt-0.5">
                    <Text size="3xl" bold className="text-foreground font-mono">
                      ~{estimatedBaseline}
                    </Text>
                    <Text size="sm" className="text-muted-foreground">
                      kg CO₂e / month
                    </Text>
                  </HStack>
                </VStack>
                <Box className="w-11 h-11 rounded-2xl bg-primary items-center justify-center">
                  <Sparkles size={20} color="white" />
                </Box>
              </HStack>
            </Card>
          </VStack>
        )}

        {/* STEP 2: LOCAL BENGALURU LOOP HUBS */}
        {step === 2 && (
          <VStack space="md">
            <VStack space="xs">
              <Text size="xs" bold className="text-primary tracking-wider uppercase">
                Step 2 of 3
              </Text>
              <Heading size="2xl">Your Local Circular Hubs</Heading>
              <Text size="xs" className="text-muted-foreground">
                Carbon Loop maps vetted repairers, recycling stations, and drop points across Bengaluru:
              </Text>
            </VStack>

            <VStack space="sm" className="mt-1">
              {LOCAL_HUBS.map((hub) => (
                <Card key={hub.name} variant="outline" className="p-3.5 gap-2">
                  <HStack className="justify-between items-center">
                    <HStack className="items-center gap-2.5 flex-1">
                      <Box className="w-9 h-9 rounded-xl bg-secondary items-center justify-center">
                        <MapPin size={18} color="rgb(46,168,110)" />
                      </Box>
                      <VStack className="flex-1">
                        <Text bold size="sm">
                          {hub.name}
                        </Text>
                        <Text size="xs" className="text-muted-foreground">
                          {hub.type} · {hub.dist} away
                        </Text>
                      </VStack>
                    </HStack>
                    <Box className="px-2 py-0.5 rounded-full bg-primary/15">
                      <Text size="xs" bold className="text-primary">
                        ✓ Verified
                      </Text>
                    </Box>
                  </HStack>
                </Card>
              ))}
            </VStack>

            <Card variant="soft" className="p-4 gap-2 bg-secondary/80">
              <HStack className="items-center gap-2">
                <Compass size={18} color="rgb(46,168,110)" />
                <Text bold size="sm">
                  12 Active Bengaluru Facilities
                </Text>
              </HStack>
              <Text size="xs" className="text-muted-foreground leading-relaxed">
                From Indiranagar device repair clinics to HSR collection drops, you can complete verified real-world actions without having to dig through map listings.
              </Text>
            </Card>
          </VStack>
        )}

        {/* STEP 3: AUTHENTICATE & GET STARTED */}
        {step === 3 && (
          <VStack space="lg" className="items-center text-center mt-4">
            <Box className="w-16 h-16 rounded-3xl bg-primary/20 items-center justify-center">
              <Layers size={32} color="rgb(46,168,110)" />
            </Box>

            <VStack space="xs" className="items-center">
              <Heading size="2xl" className="text-center">
                You're ready to start
              </Heading>
              <Text size="sm" className="text-muted-foreground text-center max-w-[300px]">
                Sign in with an existing account, create a new one, or explore live with pre-seeded personas.
              </Text>
            </VStack>

            <VStack space="sm" className="w-full mt-4">
              <Button onPress={goToSignUp} className="w-full">
                Create Free Account
              </Button>
              <Button
                variant="outline"
                onPress={goToSignIn}
                className="w-full"
              >
                Sign In / Switch Persona
              </Button>
              <Button
                variant="ghost"
                onPress={completeAsDemo}
                className="w-full mt-1"
              >
                <Text size="sm" bold className="text-primary">
                  Explore as Aisha (Default Demo) →
                </Text>
              </Button>
            </VStack>
          </VStack>
        )}
      </ScrollView>

      {/* Bottom Action Footer for Steps 0, 1, 2 */}
      {step < 3 && (
        <Box className="px-6 pt-2">
          <Button onPress={() => setStep(step + 1)} className="w-full">
            <HStack className="items-center gap-2">
              <Text bold className="text-primary-foreground">
                {step === 0 ? "Calculate My Baseline" : "Continue"}
              </Text>
              <ArrowRight size={16} color="white" />
            </HStack>
          </Button>
        </Box>
      )}
    </Box>
  );
}
