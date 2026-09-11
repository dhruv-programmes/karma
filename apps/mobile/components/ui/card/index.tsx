import React from "react";
import { View, type ViewProps } from "react-native";

export type CardProps = ViewProps & {
  className?: string;
  /** soft = default white card; softPop = mint wash highlight; flat = muted chip */
  variant?: "soft" | "softPop" | "flat" | "default";
};

const variantMap = {
  default: "bg-card border border-border rounded-3xl p-4",
  soft: "bg-card border border-border rounded-3xl p-5",
  softPop: "bg-secondary border border-primary/20 rounded-3xl p-5",
  flat: "bg-muted border border-transparent rounded-2xl p-4",
} as const;

export function Card({
  className,
  variant = "soft",
  ...props
}: CardProps) {
  return (
    <View
      className={[variantMap[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
