import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { BatteryCharging, Home, Zap } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import type { SolarImpactResponse } from "@/src/types/api";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GREEN = "#2EA86E";
const MINT = "#A7E5C2";
const GOLD = "#F4B942";
const BLUE = "#64B4E6";
const DARK_VIEWPORT = "#0B1D14";

function cubicPoint(
  progress: number,
  start: number,
  controlOne: number,
  controlTwo: number,
  end: number
) {
  "worklet";
  const inverse = 1 - progress;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * progress * controlOne +
    3 * inverse * progress * progress * controlTwo +
    progress * progress * progress * end
  );
}

function FlowNode({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}) {
  return (
    <View style={styles.flowNode}>
      <View
        style={[
          styles.flowNodeIconWrap,
          { backgroundColor: `${color}20`, borderColor: `${color}60` },
        ]}
      >
        <Icon size={16} color={color} strokeWidth={2.2} />
      </View>
      <Text style={styles.flowNodeLabel}>{label}</Text>
      <Text style={[styles.flowNodeValue, { color }]}>{value}</Text>
    </View>
  );
}

export function SolarPanelHero({ data }: { data: SolarImpactResponse }) {
  const dashOffset = useSharedValue(0);
  const batteryKw = data.live.batteryKw ?? 0;
  const evKw = data.live.evKw ?? 0;
  const hasBattery = batteryKw > 0.05;
  const hasEv = evKw > 0.05;
  const hasExport = data.live.gridExportKw > 0.05;
  const intensity = Math.min(1, Math.max(0.25, data.live.solarKw / 5));
  const panelOpacity = 0.78 + intensity * 0.22;

  useEffect(() => {
    dashOffset.value = withRepeat(
      withTiming(72, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );
  }, [dashOffset]);

  const flowProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  // Keep the particles tied to the routes instead of rendering fixed blue
  // points. Fixed points made the export path look like it had debris stuck
  // in the middle, while the animated dashes did not clearly show where the
  // energy originated. Each particle starts at the panel edge and travels to
  // its destination node, then loops back to the panel.
  const greenDotProps1 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.04) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 170, 145, 112, 73),
      cy: cubicPoint(progress, 149, 172, 185, 193),
      opacity: Math.min(fadeIn, fadeOut),
    };
  });
  const greenDotProps2 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.37) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 170, 145, 112, 73),
      cy: cubicPoint(progress, 149, 172, 185, 193),
      opacity: Math.min(fadeIn, fadeOut),
    };
  });
  const greenDotProps3 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.7) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 170, 145, 112, 73),
      cy: cubicPoint(progress, 149, 172, 185, 193),
      opacity: Math.min(fadeIn, fadeOut),
    };
  });
  const blueDotProps1 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.04) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 215, 240, 269, 311),
      cy: cubicPoint(progress, 140, 161, 177, 185),
      opacity: Math.min(fadeIn, fadeOut) * (hasExport ? 1 : 0.28),
    };
  });
  const blueDotProps2 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.37) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 215, 240, 269, 311),
      cy: cubicPoint(progress, 140, 161, 177, 185),
      opacity: Math.min(fadeIn, fadeOut) * (hasExport ? 1 : 0.28),
    };
  });
  const blueDotProps3 = useAnimatedProps(() => {
    const progress = (dashOffset.value / 72 + 0.7) % 1;
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.14);
    return {
      cx: cubicPoint(progress, 215, 240, 269, 311),
      cy: cubicPoint(progress, 140, 161, 177, 185),
      opacity: Math.min(fadeIn, fadeOut) * (hasExport ? 1 : 0.28),
    };
  });
  return (
    <View style={styles.card}>
      <BlurView
        intensity={Platform.OS === "ios" ? 50 : 85}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <ExpoLinearGradient
        colors={["rgba(255,255,255,0.78)", "rgba(255,255,255,0.42)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.cardTitle}>Solar Power in Motion</Text>
          <Text style={styles.cardSubtitle}>
            Live generation routed to your home and the grid
          </Text>
        </View>
      </View>

      {/* Isometric Animated Canvas Viewport */}
      <View style={styles.viewport}>
        <Svg width="100%" height="240" viewBox="0 0 360 240">
          <Defs>
            <LinearGradient id="solarFace" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1C5E45" stopOpacity={panelOpacity} />
              <Stop offset="0.6" stopColor="#103F35" stopOpacity={panelOpacity} />
              <Stop offset="1" stopColor="#0B2932" stopOpacity={panelOpacity} />
            </LinearGradient>
            <LinearGradient id="solarEdge" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#081B20" />
              <Stop offset="1" stopColor="#071218" />
            </LinearGradient>
          </Defs>

          <Circle cx="295" cy="38" r="10" fill={GOLD} />
          <Path
            d="M295 18v-7M295 58v7M275 38h-7M315 38h7M281 24l-5-5M309 52l5 5M309 24l5-5M281 52l-5 5"
            stroke={GOLD}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.84}
          />

          {/* Isometric panel planes */}
          <Polygon
            points="43,98 247,59 322,116 118,161"
            fill="url(#solarFace)"
            stroke="#96E2BC"
            strokeWidth="2"
          />
          <Polygon
            points="118,161 322,116 322,131 118,178"
            fill="url(#solarEdge)"
          />
          <Polygon
            points="43,98 118,161 118,178 43,113"
            fill="#123A3A"
          />
          <Path
            d="M43 98L247 59L322 116L118 161Z"
            fill="none"
            stroke="#E2FFF0"
            strokeWidth="1"
            opacity={0.48}
          />

          {/* Cell grid */}
          <Path
            d="M82 90L157 151M125 81L200 143M168 73L243 134M211 65L286 126M60 111L264 72M77 125L282 85M94 138L300 99M111 151L318 112"
            stroke="#B8F1D3"
            strokeWidth="1"
            opacity={0.36}
          />

          {/* Animated flowing dash routes */}
          <AnimatedPath
            d="M170 149C145 172 112 185 73 193"
            fill="none"
            stroke={GREEN}
            strokeWidth="3"
            strokeDasharray="4 14"
            animatedProps={flowProps}
            opacity={0.95}
          />
          <AnimatedPath
            d="M215 140C240 161 269 177 311 185"
            fill="none"
            stroke={BLUE}
            strokeWidth="3"
            strokeDasharray="4 14"
            animatedProps={flowProps}
            opacity={hasExport ? 0.95 : 0.3}
          />
          <AnimatedCircle r="2.8" fill={MINT} animatedProps={greenDotProps1} />
          <AnimatedCircle r="2.8" fill={MINT} animatedProps={greenDotProps2} />
          <AnimatedCircle r="2.8" fill={MINT} animatedProps={greenDotProps3} />
          <AnimatedCircle r="2.8" fill={BLUE} animatedProps={blueDotProps1} />
          <AnimatedCircle r="2.8" fill={BLUE} animatedProps={blueDotProps2} />
          <AnimatedCircle r="2.8" fill={BLUE} animatedProps={blueDotProps3} />
          <AnimatedPath
            d="M187 145C188 164 188 179 187 195"
            fill="none"
            stroke={GOLD}
            strokeWidth="3"
            strokeDasharray="4 14"
            animatedProps={flowProps}
            opacity={hasBattery || hasEv ? 0.95 : 0.28}
          />
        </Svg>

        <View style={styles.nodesRow}>
          <FlowNode
            icon={Home}
            label="Home"
            value={`${data.live.homeKw.toFixed(1)} kW`}
            color={MINT}
          />
          <FlowNode
            icon={BatteryCharging}
            label="Battery"
            value={hasBattery ? `${batteryKw.toFixed(1)} kW` : "Standby"}
            color={GOLD}
          />
          <FlowNode
            icon={Zap}
            label="Grid"
            value={hasExport ? `${data.live.gridExportKw.toFixed(1)} kW out` : "Balanced"}
            color={BLUE}
          />
        </View>
      </View>

      {/* Clean Inline Flow Items (No Pill Boxes) */}
      <View style={styles.flowItemsRow}>
        <View style={styles.flowItem}>
          <View style={[styles.flowDot, { backgroundColor: "#2EA86E" }]} />
          <Text style={styles.flowText}>
            Solar → Home {data.live.homeKw.toFixed(1)} kW
          </Text>
        </View>
        <View style={styles.flowItem}>
          <View style={[styles.flowDot, { backgroundColor: "#0284C7" }]} />
          <Text style={styles.flowText}>
            {hasExport
              ? `Grid Export ${data.live.gridExportKw.toFixed(1)} kW`
              : "Grid Balanced"}
          </Text>
        </View>
        {hasEv ? (
          <View style={styles.flowItem}>
            <View style={[styles.flowDot, { backgroundColor: "#D97706" }]} />
            <Text style={styles.flowText}>
              EV Charge {evKw.toFixed(1)} kW
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.82)",
    boxShadow: "0px 2px 10px rgba(10,36,21,0.06)",
    elevation: 2,
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },
  viewport: {
    position: "relative",
    height: 240,
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: DARK_VIEWPORT,
    borderWidth: 1,
    borderColor: "#18442D",
  },
  nodesRow: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  flowNode: {
    alignItems: "center",
    gap: 3,
  },
  flowNodeIconWrap: {
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  flowNodeLabel: {
    fontSize: 10,
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
  },
  flowNodeValue: {
    fontSize: 10,
    fontFamily: "IBMPlexMono_600SemiBold",
  },
  flowItemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 2,
  },
  flowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  flowText: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#526658",
  },
});
