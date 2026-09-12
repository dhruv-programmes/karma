import React from "react";
import {
  ActivityIndicator,
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from "react-native";
import { Text } from "@/components/ui/text";

const variantMap = {
  default: "bg-primary rounded-full",
  destructive: "bg-destructive rounded-full",
  outline: "bg-card rounded-full border border-border",
  secondary: "bg-secondary rounded-full",
  ghost: "bg-muted rounded-full",
  link: "bg-transparent",
  playful: "bg-accent rounded-full",
} as const;

const textVariantMap = {
  default: "text-primary-foreground",
  destructive: "text-primary-foreground",
  outline: "text-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  link: "text-primary",
  playful: "text-accent-foreground",
} as const;

const sizeMap = {
  default: "h-12 px-5",
  sm: "h-10 px-4",
  lg: "h-14 px-6",
  icon: "h-12 w-12",
} as const;

export type ButtonProps = RNPressableProps & {
  className?: string;
  variant?: keyof typeof variantMap;
  size?: keyof typeof sizeMap;
  loading?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <RNPressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={[
        "items-center justify-center flex-row min-w-0 overflow-hidden active:opacity-90",
        variantMap[variant],
        sizeMap[size],
        isDisabled ? "opacity-70" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost" || variant === "link"
              ? "rgb(24, 50, 34)"
              : "rgb(var(--primary-foreground))"
          }
        />
      ) : typeof children === "string" ? (
        <Text
          bold
          numberOfLines={1}
          className={`shrink min-w-0 ${textVariantMap[variant]}`}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </RNPressable>
  );
}

export function ButtonText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      bold
      numberOfLines={1}
      className={["shrink min-w-0 text-primary-foreground", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Text>
  );
}
