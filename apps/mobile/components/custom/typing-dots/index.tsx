import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function Dot({ delayMs }: { delayMs: number }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.set(
      withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 320 }),
            withTiming(0.25, { duration: 320 })
          ),
          -1,
          false
        )
      )
    );
  }, [delayMs, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: 0.85 + opacity.get() * 0.25 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#2EA86E",
        },
        style,
      ]}
    />
  );
}

/** Animated "…" indicator while the support agent is answering. */
export function TypingDots() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 4,
        minHeight: 22,
      }}
      accessibilityLabel="Karma is typing"
    >
      <Dot delayMs={0} />
      <Dot delayMs={160} />
      <Dot delayMs={320} />
    </View>
  );
}
