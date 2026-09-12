import React, { useState } from "react";
import { Image } from "react-native";
import { View } from "react-native";
import { ImageOff } from "lucide-react-native";

export function ProductImage({
  uri,
  size = 96,
  radius = 20,
}: {
  uri?: string | null;
  size?: number | "full";
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style =
    size === "full"
      ? { width: "100%" as const, height: 120, borderRadius: radius }
      : { width: size, height: size, borderRadius: radius };
  if (!uri || failed) {
    return (
      <View className="bg-emerald-50 items-center justify-center" style={style}>
        <ImageOff size={24} color="#2EA86E" strokeWidth={1.8} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
