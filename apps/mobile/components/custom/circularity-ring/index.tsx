import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ringColors } from "@/src/theme/ring";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  score: number | null;
  size?: number;
  label?: string;
  minScore?: number;
  maxScore?: number;
};

export function CircularityRing({
  score,
  size = 120,
  label,
  minScore = 0,
  maxScore = 100,
}: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    const range = maxScore - minScore;
    const normalized =
      score === null || range <= 0
        ? 0
        : Math.min(1, Math.max(0, (score - minScore) / range));
    progress.value = withTiming(normalized, {
      duration: 900,
    });
  }, [score, minScore, maxScore, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  return (
    <Box
      className="items-center justify-center relative"
      style={{ width: size, height: size }}
    >
      <Box
        className="absolute rounded-full bg-secondary"
        style={{ width: size * 0.78, height: size * 0.78 }}
      />
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColors.track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColors.progress}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text size="3xl" bold className="font-mono text-foreground">
          {score === null ? "—" : Math.round(score)}
        </Text>
        {label ? (
          <Text size="xs" className="text-muted-foreground">
            {label}
          </Text>
        ) : null}
      </View>
    </Box>
  );
}
