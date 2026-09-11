import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <View className={`${dim} rounded-full bg-secondary items-center justify-center`}>
      <Text bold className="text-secondary-foreground">
        {initial}
      </Text>
    </View>
  );
}
