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
import * as Haptics from "expo-haptics";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
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

  function handleSelect(value: string) {
    setSelectedLocation(value);
    Haptics.selectionAsync().catch(() => {});
  }

  function handleContinue() {
    if (!selectedLocation) return;
    setManualLocation(selectedLocation);
    completeOnboarding();
    router.replace("/(tabs)");
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

      <HStack className="items-center justify-between mb-4">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-[#E1EDE4]"
          style={styles.headerBtnShadow}
          hitSlop={8}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color="#112318" />
        </Pressable>
        <Box className="px-3.5 py-1.5 rounded-full bg-white/90 border border-[#CDE5D6] shadow-sm">
          <Text size="xs" bold className="text-[#1E5E3A] font-mono uppercase text-[11px] tracking-wider">
            Your area
          </Text>
        </Box>
        <Box className="w-10 h-10" />
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pinBadge}>
          <MapPin size={24} color="#1E5E3A" />
        </View>

        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-[#112318] text-[28px] leading-tight">
            Choose your location
          </Heading>
          <Text size="sm" className="text-[#527060] leading-relaxed font-body">
            Pick the city you want to use for nearby circular options. We only use seeded locations in this demo.
          </Text>
        </VStack>

        <VStack space="sm" className="mt-1">
          {LOCATIONS.map((location) => {
            const value = `${location.city}, ${location.region}`;
            const isSelected = selectedLocation === value;
            return (
              <Pressable
                key={value}
                onPress={() => handleSelect(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.locationCard,
                  isSelected && styles.locationCardSelected,
                ]}
              >
                <HStack className="items-center gap-3">
                  <View
                    style={[
                      styles.iconBox,
                      isSelected && styles.iconBoxSelected,
                    ]}
                  >
                    <MapPin size={18} color="#1E5E3A" />
                  </View>
                  <VStack className="flex-1 min-w-0">
                    <HStack className="items-baseline gap-2">
                      <Text style={styles.cityText}>
                        {location.city}
                      </Text>
                      <Text style={styles.regionText}>
                        {location.region}
                      </Text>
                    </HStack>
                    <Text style={styles.descText} numberOfLines={2}>
                      {location.description}
                    </Text>
                  </VStack>
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
      </ScrollView>

      <VStack space="sm" className="pt-2">
        <Button
          onPress={handleContinue}
          disabled={!selectedLocation}
          className="w-full h-13 rounded-2xl bg-[#1E5E3A] active:bg-[#16472C]"
          style={styles.ctaShadow}
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-white text-base font-body font-bold">
              Use this location
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
        <Text style={styles.footnote}>
          You can change this later from settings.
        </Text>
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
  locationCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.92)",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    padding: 13,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  locationCardSelected: {
    backgroundColor: "rgba(238, 252, 244, 0.94)",
    borderColor: "rgba(46, 168, 110, 0.65)",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(230, 246, 237, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxSelected: {
    backgroundColor: "#E2F4EA",
    borderColor: "#BDE3CC",
  },
  cityText: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  regionText: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#1E5E3A",
  },
  descText: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    marginTop: 2,
    lineHeight: 15,
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
  footnote: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#6C8A79",
    textAlign: "center",
  },
});

