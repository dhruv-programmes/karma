import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from "react-native-svg";
import { BatteryCharging, Home, Zap } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { SolarImpactResponse } from "@/src/types/api";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const GREEN = "#2EA86E";
const GOLD = "#F4B942";
const BLUE = "#3D8BC9";
const INK = "#10261F";

function FlowNode({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "gold";
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}) {
  const colors = { green: GREEN, blue: BLUE, gold: GOLD };
  const color = colors[tone];
  return (
    <Box className="items-center gap-1">
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl border"
        style={{ borderColor: `${color}55`, backgroundColor: `${color}18` }}
      >
        <Icon size={19} color={color} strokeWidth={2} />
      </View>
      <Text size="2xs" bold>{label}</Text>
      <Text size="2xs" className="text-muted-foreground">{value}</Text>
    </Box>
  );
}

/** Lightweight isometric solar visual. It uses SVG layers and Reanimated only; no WebGL or 3D engine. */
export function SolarPanelHero({ data }: { data: SolarImpactResponse }) {
  const pulse = useSharedValue(0.55);
  const dash = useSharedValue(0);
  const intensity = Math.min(1, Math.max(0.25, data.live.solarKw / 5));
  const hasExport = data.live.gridExportKw > 0.05;
  const batteryKw = data.live.batteryKw ?? 0;
  const evKw = data.live.evKw ?? 0;
  const hasBattery = batteryKw > 0.05;
  const hasEv = evKw > 0.05;

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    dash.value = withRepeat(withTiming(24, { duration: 1800, easing: Easing.linear }), -1, false);
  }, [dash, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + pulse.value * 0.26 * intensity,
    transform: [{ scale: 0.9 + pulse.value * 0.12 }],
  }));

  const animatedFlow = useAnimatedProps(() => ({
    strokeDashoffset: -dash.value,
  }));

  const panelOpacity = 0.72 + intensity * 0.28;
  return (
    <Card variant="softPop" className="gap-3 overflow-hidden">
      <Box className="flex-row items-center justify-between">
        <Box>
          <Text bold size="lg">Live solar system</Text>
          <Text size="xs" className="text-muted-foreground">Sunlight is being routed through your home</Text>
        </Box>
        <Box className="rounded-full bg-background/70 px-3 py-1">
          <Text size="2xs" bold className="text-primary">{data.live.solarKw.toFixed(1)} kW now</Text>
        </Box>
      </Box>

      <View className="relative h-[238px] w-full items-center justify-center rounded-3xl border border-white/50 bg-[#dff5eb]">
        <Animated.View
          pointerEvents="none"
          className="absolute right-10 top-3 h-24 w-24 rounded-full bg-warning/40"
          style={glowStyle}
        />
        <Svg width="100%" height="218" viewBox="0 0 360 218">
          <Defs>
            <LinearGradient id="panelFace" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1e6e61" stopOpacity={panelOpacity} />
              <Stop offset="0.55" stopColor="#143d48" stopOpacity={panelOpacity} />
              <Stop offset="1" stopColor="#09262f" stopOpacity={panelOpacity} />
            </LinearGradient>
            <LinearGradient id="panelEdge" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#0b2f37" />
              <Stop offset="1" stopColor="#082229" />
            </LinearGradient>
            <LinearGradient id="sunGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffe8a3" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#f4b942" stopOpacity="0.15" />
            </LinearGradient>
          </Defs>

          <Circle cx="294" cy="32" r="26" fill="url(#sunGlow)" />
          <Circle cx="294" cy="32" r="11" fill={GOLD} opacity="0.95" />
          <Path d="M294 10v-7M294 54v7M272 32h-7M316 32h7M279 17l-5-5M309 47l5 5M309 17l5-5M279 47l-5 5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.72" />

          {/* Subtle sunlight rays into the panel. */}
          <Path d="M282 50L224 89M298 51L247 90M314 51L268 91" stroke={GOLD} strokeWidth="2" strokeDasharray="5 6" opacity="0.5" />

          {/* Isometric panel face and its raised lower edge. */}
          <Polygon points="58,91 245,57 302,111 115,148" fill="url(#panelFace)" stroke="#80d7b0" strokeWidth="2" />
          <Polygon points="115,148 302,111 302,126 115,165" fill="url(#panelEdge)" opacity="0.95" />
          <Polygon points="58,91 115,148 115,165 58,108" fill="#123f45" opacity="0.9" />

          {/* Panel cell grid creates the depth cue without a heavy model. */}
          <Path d="M102 83L158 138M143 76L199 130M184 68L240 122M225 61L281 115M82 96L269 62M95 109L282 75M108 122L295 88M121 135L302 99" stroke="#a9ead0" strokeWidth="1" opacity="0.34" />
          <Path d="M58 91L245 57L302 111L115 148Z" fill="none" stroke="#d3f8e7" strokeWidth="1" opacity="0.45" />

          {/* Animated dotted energy routes. */}
          <AnimatedPath d="M164 139C145 159 117 177 82 184" fill="none" stroke={GREEN} strokeWidth="3" strokeDasharray="4 14" animatedProps={animatedFlow} opacity={0.95} />
          <AnimatedPath d="M201 130C223 151 251 168 286 177" fill="none" stroke={BLUE} strokeWidth="3" strokeDasharray="4 14" animatedProps={animatedFlow} opacity={hasExport ? 0.95 : 0.28} />
          <AnimatedPath d="M181 136C182 157 183 171 181 186" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="4 14" animatedProps={animatedFlow} opacity={hasBattery || hasEv ? 0.95 : 0.3} />
        </Svg>

        <Box className="absolute bottom-2 left-5 right-5 flex-row items-end justify-between">
          <FlowNode icon={Home} label="Home" value={`${data.live.homeKw.toFixed(1)} kW`} tone="green" />
          <FlowNode icon={BatteryCharging} label="Battery" value={hasBattery ? `${batteryKw.toFixed(1)} kW` : "Ready"} tone="gold" />
          <FlowNode icon={Zap} label="Grid" value={hasExport ? `${data.live.gridExportKw.toFixed(1)} kW out` : "Balanced"} tone="blue" />
        </Box>
      </View>

      <Box className="flex-row flex-wrap gap-2">
        <Text size="2xs" className="rounded-full bg-background/75 px-3 py-1 text-primary">Solar → Home {data.live.homeKw.toFixed(1)} kW</Text>
        <Text size="2xs" className="rounded-full bg-background/75 px-3 py-1 text-info">{hasExport ? "Solar → Grid active" : "Grid balanced"}</Text>
        {hasEv ? <Text size="2xs" className="rounded-full bg-warning/15 px-3 py-1 text-warning">Solar → EV {evKw.toFixed(1)} kW</Text> : null}
      </Box>
      <Text size="2xs" className="text-muted-foreground">Demo flow · intensity responds to current solar generation and export.</Text>
    </Card>
  );
}
