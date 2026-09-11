import React from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/text";

export type BadgeProps = ViewProps & {
  className?: string;
  action?: "muted" | "success" | "warning" | "error" | "playful";
  label?: string;
};

const actionMap = {
  muted: "bg-muted",
  success: "bg-secondary",
  warning: "bg-accent/25",
  error: "bg-destructive/15",
  playful: "bg-accent/30",
} as const;

const textMap = {
  muted: "text-muted-foreground",
  success: "text-secondary-foreground",
  warning: "text-accent-foreground",
  error: "text-destructive",
  playful: "text-accent-foreground",
} as const;

export function Badge({
  className,
  action = "muted",
  label,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={[
        "px-3 py-1 rounded-full self-start",
        actionMap[action],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {label ? (
        <Text size="xs" bold className={textMap[action]}>
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
