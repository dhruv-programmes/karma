import React, { useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
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
  { id: "sometimes", label: "Sometimes" },
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

function GlassSliderCard({
  title,
  desc,
  Icon,
  value,
  onChange,
  onDragStart,
  onDragEnd,
}: {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  value: Frequency;
  onChange: (val: Frequency) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const trackWidthRef = useRef(0);
  const startThumbLeftRef = useRef(0);

  const activeIndex = FREQUENCY_OPTIONS.findIndex((o) => o.id === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const currentOption = FREQUENCY_OPTIONS[safeIndex];

  const safeIndexRef = useRef(safeIndex);
  safeIndexRef.current = safeIndex;

  const valueRef = useRef(value);
  valueRef.current = value;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const lastSnappedOptionRef = useRef<Frequency>(value);

  const thumbSize = 24;
  const thumbRadius = 12;
  const usableWidth = Math.max(0, trackWidth - thumbSize);
  const thumbLeft =
    dragOffset !== null ? dragOffset : (safeIndex / 3) * usableWidth;
  const fillWidth = thumbLeft;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => {
        onDragStartRef.current?.();

        const width = trackWidthRef.current;
        const usable = Math.max(0, width - thumbSize);
        if (usable <= 0) return;

        const currentThumb = (safeIndexRef.current / 3) * usable;
        const tapX = evt.nativeEvent.locationX;

        // If direct tap outside the current thumb, jump to tapped location
        if (Math.abs(tapX - (currentThumb + thumbRadius)) > thumbRadius * 1.2) {
          const clampedX = Math.max(0, Math.min(usable, tapX - thumbRadius));
          const stepFraction = clampedX / usable;
          const nearestIndex = Math.min(
            3,
            Math.max(0, Math.round(stepFraction * 3))
          );
          const tappedOption = FREQUENCY_OPTIONS[nearestIndex].id;
          if (tappedOption !== valueRef.current) {
            onChangeRef.current(tappedOption);
            lastSnappedOptionRef.current = tappedOption;
            Haptics.selectionAsync().catch(() => {});
          }
          const snappedThumb = (nearestIndex / 3) * usable;
          startThumbLeftRef.current = snappedThumb;
          setDragOffset(snappedThumb);
        } else {
          startThumbLeftRef.current = currentThumb;
          setDragOffset(currentThumb);
          lastSnappedOptionRef.current = valueRef.current;
        }
      },

      onPanResponderMove: (_, gestureState) => {
        const width = trackWidthRef.current;
        const usable = Math.max(0, width - thumbSize);
        if (usable > 0) {
          const nextPos = Math.max(
            0,
            Math.min(usable, startThumbLeftRef.current + gestureState.dx)
          );
          setDragOffset(nextPos);

          const stepFraction = nextPos / usable;
          const nearestIndex = Math.min(
            3,
            Math.max(0, Math.round(stepFraction * 3))
          );
          const currentOptionId = FREQUENCY_OPTIONS[nearestIndex].id;
          if (currentOptionId !== lastSnappedOptionRef.current) {
            lastSnappedOptionRef.current = currentOptionId;
            onChangeRef.current(currentOptionId);
            Haptics.selectionAsync().catch(() => {});
          }
        }
      },

      onPanResponderRelease: () => {
        setDragOffset(null);
        onDragEndRef.current?.();
        Haptics.selectionAsync().catch(() => {});
      },

      onPanResponderTerminate: () => {
        setDragOffset(null);
        onDragEndRef.current?.();
      },
    })
  ).current;

  return (
    <View style={styles.glassCard}>
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.82)", "rgba(255, 255, 255, 0.62)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Header Row */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconBox}>
          <Icon size={19} color="#1E5E3A" />
        </View>
        <View style={styles.cardHeaderCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <View
          style={[
            styles.activePill,
            safeIndex === 0 && styles.activePillZero,
          ]}
        >
          <Text
            style={[
              styles.activePillText,
              safeIndex === 0 && styles.activePillTextZero,
            ]}
          >
            {currentOption.label}
          </Text>
        </View>
      </View>

      {/* Interactive Slider Area */}
      <View style={styles.sliderSection}>
        <View
          style={styles.trackTouchContainer}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            trackWidthRef.current = w;
            setTrackWidth(w);
          }}
          {...panResponder.panHandlers}
        >
          {/* Track background inset so ticks align with thumb centers */}
          <View style={styles.trackBar} pointerEvents="none">
            {/* Active Track Fill */}
            <View
              style={[
                styles.trackBarFill,
                { width: trackWidth > 0 ? fillWidth : 0 },
              ]}
            />
            {/* Step Tick Marks on track */}
            {[0, 1, 2, 3].map((step) => {
              const isFilled = step <= safeIndex;
              const stepLeft = (step / 3) * 100;
              return (
                <View
                  key={step}
                  style={[
                    styles.trackTick,
                    {
                      left: `${stepLeft}%`,
                      backgroundColor: isFilled
                        ? "#1E5E3A"
                        : "rgba(180, 212, 195, 0.8)",
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Draggable Knob */}
          {trackWidth > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.sliderThumb,
                {
                  transform: [{ translateX: thumbLeft }],
                },
              ]}
            >
              <View style={styles.thumbCenterDot} />
            </View>
          ) : null}
        </View>

        {/* Labels row underneath track */}
        <View style={styles.labelsRow}>
          {FREQUENCY_OPTIONS.map((opt, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  onChange(opt.id);
                  Haptics.selectionAsync().catch(() => {});
                }}
                hitSlop={8}
                style={[
                  styles.labelPressable,
                  idx === 0 && { alignItems: "flex-start" },
                  idx === 3 && { alignItems: "flex-end" },
                  idx > 0 && idx < 3 && { alignItems: "center" },
                ]}
              >
                <Text
                  style={[
                    styles.sliderLabelText,
                    isSelected && styles.sliderLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function BaselineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const storedBaseline = useAuthStore((s) => s.baseline);
  const setBaseline = useAuthStore((s) => s.setBaseline);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
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
      className="flex-1"
      style={{
        backgroundColor: "#F4F8F5",
        paddingTop: insets.top + 14,
        paddingBottom: insets.bottom + 18,
        paddingHorizontal: 22,
      }}
    >
      {/* 1. Botanical Background Image */}
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

      {/* Navigation & Progress Header */}
      <HStack className="items-center justify-between mb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 items-center justify-center border border-[#E1EDE4]"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 1,
          }}
          hitSlop={8}
        >
          <ArrowLeft size={18} color="#112318" />
        </Pressable>

        <Box className="px-3.5 py-1.5 rounded-full bg-white/90 border border-[#CDE5D6] shadow-sm">
          <Text size="xs" bold className="text-[#1E5E3A] font-mono uppercase text-[11px] tracking-wider">
            Step 1 of 2
          </Text>
        </Box>

        <Box className="w-10 h-10" />
      </HStack>

      {/* Progress Line */}
      <Box className="w-full h-1.5 bg-[#DCEAE0] rounded-full overflow-hidden mb-4">
        <Box className="w-1/2 h-full bg-[#2EA86E] rounded-full" />
      </Box>

      <ScrollView
        className="flex-1"
        scrollEnabled={!isDraggingSlider}
        contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <VStack space="xs">
          <Heading size="2xl" className="font-heading text-[#112318] text-[28px] leading-tight">
            Tell us a little about your routine
          </Heading>
          <Text size="sm" className="text-[#527060] mt-1 leading-relaxed font-body">
            Slide to indicate how often you use each option. You can update this anytime.
          </Text>
        </VStack>

        {/* SECTION 1: HOW DO YOU GET AROUND */}
        <VStack space="sm" className="mt-1">
          <Text bold size="sm" className="text-[#112318] font-heading text-[16px]">
            How do you usually get around?
          </Text>

          <VStack space="sm">
            {TRANSPORT_ITEMS.map((item) => (
              <GlassSliderCard
                key={item.key}
                title={item.title}
                desc={item.desc}
                Icon={item.Icon}
                value={transport[item.key]}
                onChange={(val) => updateTransport(item.key, val)}
                onDragStart={() => setIsDraggingSlider(true)}
                onDragEnd={() => setIsDraggingSlider(false)}
              />
            ))}
          </VStack>
        </VStack>

        {/* SECTION 2: SHOPPING & LIFESTYLE */}
        <VStack space="sm" className="mt-2">
          <Text bold size="sm" className="text-[#112318] font-heading text-[16px]">
            What best describes your shopping?
          </Text>

          <VStack space="sm">
            {SHOPPING_ITEMS.map((item) => (
              <GlassSliderCard
                key={item.key}
                title={item.title}
                desc={item.desc}
                Icon={item.Icon}
                value={shopping[item.key]}
                onChange={(val) => updateShopping(item.key, val)}
                onDragStart={() => setIsDraggingSlider(true)}
                onDragEnd={() => setIsDraggingSlider(false)}
              />
            ))}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Bottom CTA */}
      <Box className="pt-2">
        <Button
          onPress={handleContinue}
          className="w-full h-13 rounded-2xl bg-[#1E5E3A] active:bg-[#16472C]"
          style={{
            shadowColor: "#184A2C",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <HStack className="items-center justify-center gap-2 min-w-0 px-2">
            <ButtonText className="text-white text-base font-body font-bold">
              Continue
            </ButtonText>
            <ArrowRight size={18} color="white" />
          </HStack>
        </Button>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.88)",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    padding: 14,
    gap: 10,
    overflow: "hidden",
    shadowColor: "#184A2C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(224, 244, 233, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(185, 222, 202, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#567464",
    marginTop: 1.5,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    backgroundColor: "#E2F4EA",
    borderWidth: 1,
    borderColor: "rgba(175, 218, 194, 0.75)",
  },
  activePillZero: {
    backgroundColor: "rgba(240, 246, 242, 0.85)",
    borderColor: "rgba(205, 224, 214, 0.6)",
  },
  activePillText: {
    fontSize: 11.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#165330",
  },
  activePillTextZero: {
    color: "#6C8A79",
  },
  sliderSection: {
    gap: 4,
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  trackTouchContainer: {
    height: 38,
    justifyContent: "center",
  },
  trackBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(210, 232, 220, 0.85)",
    overflow: "visible",
    position: "relative",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  trackBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: "#2EA86E",
  },
  trackTick: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    top: 0,
  },
  sliderThumb: {
    position: "absolute",
    top: 7,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#1E5E3A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D2C1A",
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  thumbCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1E5E3A",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  labelPressable: {
    flex: 1,
    paddingVertical: 2,
  },
  sliderLabelText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#728F80",
  },
  sliderLabelActive: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#0B1D12",
  },
});
