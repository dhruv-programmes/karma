import React from "react";
import { Image } from "expo-image";
import { View } from "react-native";

export function ProductImage({
  uri,
  size = 96,
  radius = 20,
}: {
  uri?: string | null;
  size?: number | "full";
  radius?: number;
}) {
  const style =
    size === "full"
      ? { width: "100%" as const, height: 120, borderRadius: radius }
      : { width: size, height: size, borderRadius: radius };
  if (!uri) {
    return <View className="bg-muted" style={style} />;
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={200}
    />
  );
}
