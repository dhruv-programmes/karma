import React from "react";
import { View } from "react-native";

export function Progress({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "accent" | "warning" | "danger" | "info";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const bar =
    tone === "accent"
      ? "bg-accent"
      : tone === "warning"
        ? "bg-warning"
        : tone === "danger"
          ? "bg-danger"
          : tone === "info"
            ? "bg-info"
            : "bg-primary";
  return (
    <View className={["h-2 rounded-full bg-muted overflow-hidden", className].filter(Boolean).join(" ")}>
      <View className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
