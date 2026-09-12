import React from "react";
import { View } from "react-native";
import { Box } from "@/components/ui/box";

export function DecorativeBackground() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Top right warm blush/peach organic circle - framed in top right corner behind actions, clear of logo */}
      <Box className="absolute -top-8 -right-12 w-44 h-44 rounded-full bg-accent/30" />
      {/* Mid-left calm sage-mint organic circle */}
      <Box className="absolute top-52 -left-24 w-64 h-64 rounded-full bg-primary/20" />
    </View>
  );
}
