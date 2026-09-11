import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export function ScanOverlay() {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(220, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [y]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: 0.9,
  }));

  return (
    <View className="w-[260px] h-[260px] self-center" pointerEvents="none">
      <View className="absolute top-0 left-0 w-8 h-8 rounded-tl-2xl border-t-[3px] border-l-[3px] border-primary" />
      <View className="absolute top-0 right-0 w-8 h-8 rounded-tr-2xl border-t-[3px] border-r-[3px] border-primary" />
      <View className="absolute bottom-0 left-0 w-8 h-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-primary" />
      <View className="absolute bottom-0 right-0 w-8 h-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-primary" />
      <Animated.View className="absolute left-4 right-4 h-1 rounded-full bg-accent" style={lineStyle} />
    </View>
  );
}
