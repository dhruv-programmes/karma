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
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
  MapPin,
  Recycle,
  Wrench,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuthStore } from "@/src/store/auth";

const CIRCULAR_OPTIONS = [
  {
    id: "repair",
    title: "Repair partners",
    desc: "Certified device and appliance workshops.",
    Icon: Wrench,
  },
  {
    id: "recycle",
    title: "Recycling facilities",
    desc: "Responsible e-waste and material drop centers.",
    Icon: Recycle,
  },
  {
    id: "donation",
    title: "Donation hubs",
    desc: "Verified community re-circulation hubs.",
    Icon: HeartHandshake,
  },
];

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setLocationPreference = useAuthStore((s) => s.setLocationPreference);

  const [requesting, setRequesting] = useState(false);

  async function handleRequestLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    Haptics.selectionAsync().catch(() => {});
    setLocationPreference("manual");
    completeOnboarding();
    router.replace("/(tabs)");
  }

  function handleManualSelection() {
    Haptics.selectionAsync().catch(() => {});
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

      {/* Top Navigation Bar */}
      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-[#E1EDE4]"
          style={styles.headerBtnShadow}
          hitSlop={8}
        >
          <ArrowLeft size={18} color="#112318" />
        </Pressable>

        <Pressable
          onPress={handleSkip}
          className="px-3.5 py-1.5 rounded-full bg-white/90 border border-[#DCEAE0]"
          hitSlop={8}
        >
          <Text style={styles.skipBtnText}>
            Not now
          </Text>
        </Pressable>
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Pin Icon Badge */}
        <View style={styles.pinBadge}>
          <MapPin size={24} color="#1E5E3A" />
        </View>

        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-[#112318] text-[28px] leading-tight">
            Find circular options near you
          </Heading>
          <Text size="sm" className="text-[#527060] mt-1 leading-relaxed font-body">
            Your next action can be local. We'll help you find nearby verified services so taking circular action is effortless.
          </Text>
        </VStack>

        {/* 3 Circular Feature Cards with Glassmorphism */}
        <VStack space="sm" className="mt-1">
          {CIRCULAR_OPTIONS.map((item) => {
            const IconComp = item.Icon;
            return (
              <View key={item.id} style={styles.glassCard}>
                {Platform.OS === "ios" ? (
                  <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
                ) : null}
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.86)", "rgba(255, 255, 255, 0.65)"]}
                  style={StyleSheet.absoluteFill}
                />

                <HStack className="items-center gap-3.5">
                  <View style={styles.iconBox}>
                    <IconComp size={19} color="#1E5E3A" />
                  </View>
                  <VStack className="flex-1 min-w-0">
                    <Text style={styles.cardTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardDesc}>
                      {item.desc}
                    </Text>
                  </VStack>
                </HStack>
              </View>
            );
          })}
        </VStack>
      </ScrollView>

      {/* Bottom CTA Block */}
      <VStack space="xs" className="w-full pt-2">
        <Button
          onPress={handleRequestLocation}
          disabled={requesting}
          className="w-full h-13 rounded-2xl bg-[#1E5E3A] active:bg-[#16472C]"
          style={styles.ctaShadow}
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-white text-base font-body font-bold">
              {requesting ? "Requesting..." : "Use my location"}
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>

        <Pressable
          onPress={handleManualSelection}
          className="w-full h-11 items-center justify-center active:opacity-70"
          hitSlop={8}
        >
          <Text style={styles.manualBtnText}>
            Choose location manually
          </Text>
        </Pressable>
      </VStack>
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
  skipBtnText: {
    fontSize: 12.5,
    fontFamily: "Nunito_700Bold",
    color: "#567464",
  },
  pinBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 14,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    marginTop: 1.5,
  },
  ctaShadow: {
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  manualBtnText: {
    fontSize: 13.5,
    fontFamily: "Nunito_700Bold",
    color: "#527060",
  },
});
