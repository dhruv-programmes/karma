import React, { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

type Props = {
  points: number;
  visible: boolean;
};

export function PointsCounter({ points, visible }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 400 })
    );
    scale.value = withSequence(
      withTiming(1.05, { duration: 250 }),
      withTiming(1, { duration: 200 })
    );
  }, [visible, points, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={style}
      className="absolute bottom-28 self-center bg-accent px-6 py-3 rounded-full"
    >
      <Text bold className="text-accent-foreground">
        +{points} Impact Points
      </Text>
    </Animated.View>
  );
}
