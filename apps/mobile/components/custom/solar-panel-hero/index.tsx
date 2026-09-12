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
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { BatteryCharging, Home, Zap } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { SolarImpactResponse } from "@/src/types/api";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const GREEN = "#2EA86E";
const MINT = "#A7E5C2";
const GOLD = "#F4B942";
const BLUE = "#64B4E6";
const DARK = "#0D1811";

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
    <Box className="items-center gap-1">
      <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}22`, borderColor: `${color}70`, borderWidth: 1 }}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <Text size="2xs" bold style={{ color: "#FFFFFF" }}>{label}</Text>
      <Text size="2xs" style={{ color: "#AFC7B7" }}>{value}</Text>
    </Box>
  );
}

/** A lightweight SVG energy scene: depth comes from layered planes, not a 3D engine. */
export function SolarPanelHero({ data }: { data: SolarImpactResponse }) {
  const pulse = useSharedValue(0.4);
  const dash = useSharedValue(0);
  const intensity = Math.min(1, Math.max(0.25, data.live.solarKw / 5));
  const batteryKw = data.live.batteryKw ?? 0;
  const evKw = data.live.evKw ?? 0;
  const hasExport = data.live.gridExportKw > 0.05;
  const hasBattery = batteryKw > 0.05;
  const hasEv = evKw > 0.05;

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.95, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    dash.value = withRepeat(withTiming(28, { duration: 1800, easing: Easing.linear }), -1, false);
  }, [dash, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + pulse.value * 0.22 * intensity,
    transform: [{ scale: 0.88 + pulse.value * 0.12 }],
  }));
  const flowProps = useAnimatedProps(() => ({ strokeDashoffset: -dash.value }));
  const panelOpacity = 0.78 + intensity * 0.22;

  return (
    <Card style={{ backgroundColor: DARK, borderColor: "#20563A" }} className="gap-4 overflow-hidden">
      <Box className="flex-row items-start justify-between gap-3">
        <Box className="flex-1">
          <Text bold size="lg" style={{ color: "#FFFFFF" }}>Solar power in motion</Text>
          <Text size="xs" style={{ color: "#AFC7B7" }}>Live generation routed to your home and the grid.</Text>
        </Box>
        <Box className="rounded-full px-3 py-1" style={{ backgroundColor: "#1B4E34" }}>
          <Text size="2xs" bold style={{ color: MINT }}>{data.live.solarKw.toFixed(1)} kW now</Text>
        </Box>
      </Box>

      <View className="relative h-[250px] w-full overflow-hidden rounded-3xl" style={{ backgroundColor: "#132A1D", borderColor: "#28583C", borderWidth: 1 }}>
        <Animated.View pointerEvents="none" className="absolute right-8 top-3 h-28 w-28 rounded-full" style={[{ backgroundColor: "#D8A82F" }, glowStyle]} />
        <Svg width="100%" height="226" viewBox="0 0 360 226">
          <Defs>
            <LinearGradient id="solarFace" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2A8C69" stopOpacity={panelOpacity} />
              <Stop offset="0.48" stopColor="#185A50" stopOpacity={panelOpacity} />
              <Stop offset="1" stopColor="#0B2932" stopOpacity={panelOpacity} />
            </LinearGradient>
            <LinearGradient id="solarEdge" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#081B20" />
              <Stop offset="1" stopColor="#071218" />
            </LinearGradient>
            <LinearGradient id="sunDisc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFF0B7" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#E1A92E" stopOpacity="0.08" />
            </LinearGradient>
          </Defs>

          <Circle cx="295" cy="40" r="34" fill="url(#sunDisc)" />
          <Circle cx="295" cy="40" r="10" fill={GOLD} />
          <Path d="M295 19v-8M295 61v8M274 40h-8M316 40h8M280 25l-6-6M310 55l6 6M310 25l6-6M280 55l-6 6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.84" />

          {/* Layered plane + deep edge create an isometric panel silhouette. */}
          <Polygon points="43,104 247,63 322,122 118,169" fill="url(#solarFace)" stroke="#96E2BC" strokeWidth="2" />
          <Polygon points="118,169 322,122 322,138 118,188" fill="url(#solarEdge)" />
          <Polygon points="43,104 118,169 118,188 43,119" fill="#123A3A" />
          <Path d="M43 104L247 63L322 122L118 169Z" fill="none" stroke="#E2FFF0" strokeWidth="1" opacity="0.48" />

          {/* Cell grid follows the perspective of the panel face. */}
          <Path d="M82 96L157 159M125 87L200 151M168 78L243 142M211 70L286 133M60 118L264 77M77 132L282 91M94 146L300 105M111 159L318 119" stroke="#B8F1D3" strokeWidth="1" opacity="0.36" />

          {/* Flow routes use moving dashes so the panel reads as live, not decorative. */}
          <AnimatedPath d="M170 157C145 181 112 194 73 202" fill="none" stroke={GREEN} strokeWidth="3" strokeDasharray="4 14" animatedProps={flowProps} opacity="0.95" />
          <AnimatedPath d="M215 147C240 169 269 186 311 194" fill="none" stroke={BLUE} strokeWidth="3" strokeDasharray="4 14" animatedProps={flowProps} opacity={hasExport ? 0.95 : 0.3} />
          <AnimatedPath d="M187 153C188 173 188 189 187 205" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="4 14" animatedProps={flowProps} opacity={hasBattery || hasEv ? 0.95 : 0.28} />
        </Svg>

        <Box className="absolute bottom-2 left-5 right-5 flex-row items-end justify-between">
          <FlowNode icon={Home} label="Home" value={`${data.live.homeKw.toFixed(1)} kW`} color={MINT} />
          <FlowNode icon={BatteryCharging} label="Battery" value={hasBattery ? `${batteryKw.toFixed(1)} kW` : "Ready"} color={GOLD} />
          <FlowNode icon={Zap} label="Grid" value={hasExport ? `${data.live.gridExportKw.toFixed(1)} kW out` : "Balanced"} color={BLUE} />
        </Box>
      </View>

      <Box className="flex-row flex-wrap gap-2">
        <Text size="2xs" className="rounded-full px-3 py-1" style={{ backgroundColor: "#173B29", color: MINT }}>Home use {data.live.homeKw.toFixed(1)} kW</Text>
        <Text size="2xs" className="rounded-full px-3 py-1" style={{ backgroundColor: "#18344A", color: "#A5D8F6" }}>{hasExport ? "Grid export active" : "Grid balanced"}</Text>
        {hasEv ? <Text size="2xs" className="rounded-full px-3 py-1" style={{ backgroundColor: "#44391A", color: "#FFE29A" }}>EV charging {evKw.toFixed(1)} kW</Text> : null}
      </Box>
    </Card>
  );
}
