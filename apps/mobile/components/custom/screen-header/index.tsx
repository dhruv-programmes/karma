import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  animated?: boolean;
};

/** Mono eyebrow + Nunito title used across Karma tab screens. */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  animated = true,
}: ScreenHeaderProps) {
  const body = (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  if (!animated) return body;

  return (
    <Animated.View entering={FadeInDown.duration(320)}>{body}</Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#2EA86E",
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
    letterSpacing: -0.6,
    color: "#0D1811",
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B8576",
  },
});
