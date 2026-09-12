import React from "react";
import { View } from "react-native";
import { Box } from "@/components/ui/box";

/** Original minimal organic accents — light peach + sage only. */
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
      {/* Top right warm blush */}
      <Box className="absolute -top-8 -right-12 w-44 h-44 rounded-full bg-accent/30" />
      {/* Mid-left calm sage-mint */}
      <Box className="absolute top-[430px] -left-28 w-64 h-64 rounded-full bg-primary/20" />
    </View>
  );
}
