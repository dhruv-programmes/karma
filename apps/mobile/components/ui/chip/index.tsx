import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function Chip({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "primary" | "accent" | "info" | "warning" | "success";
}) {
  const bg =
    tone === "primary"
      ? "bg-primary/15"
      : tone === "accent"
        ? "bg-accent/25"
        : tone === "info"
          ? "bg-info/15"
          : tone === "warning"
            ? "bg-warning/20"
            : tone === "success"
              ? "bg-success/15"
              : "bg-muted";
  const fg =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent-foreground"
        : tone === "info"
          ? "text-info"
          : tone === "warning"
            ? "text-warning"
            : tone === "success"
              ? "text-success"
              : "text-muted-foreground";
  return (
    <View className={`px-3 py-1 rounded-full self-start ${bg}`}>
      <Text size="xs" bold className={fg}>
        {label}
      </Text>
    </View>
  );
}
