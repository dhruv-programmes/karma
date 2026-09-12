import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

const sizeMap = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
} as const;

export type HeadingProps = RNTextProps & {
  className?: string;
  size?: keyof typeof sizeMap;
  bold?: boolean;
};

export function Heading({
  className,
  size = "lg",
  bold = true,
  style,
  ...props
}: HeadingProps) {
  return (
    <RNText
      className={["text-foreground", sizeMap[size], className]
        .filter(Boolean)
        .join(" ")}
      style={[
        {
          fontFamily: bold ? "Schoolbell_400Regular" : "Schoolbell_400Regular",
        },
        style,
      ]}
      {...props}
    />
  );
}
