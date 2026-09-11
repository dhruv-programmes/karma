import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

const sizeMap = {
  "2xs": "text-2xs",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
} as const;

export type TextProps = RNTextProps & {
  className?: string;
  size?: keyof typeof sizeMap;
  bold?: boolean;
  isTruncated?: boolean;
};

export function Text({
  className,
  size = "md",
  bold,
  isTruncated,
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      className={[
        "text-foreground",
        sizeMap[size],
        isTruncated ? "truncate" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={[
        {
          fontFamily: className?.includes("font-mono")
            ? bold
              ? "IBMPlexMono_600SemiBold"
              : "IBMPlexMono_500Medium"
            : bold
              ? "Nunito_700Bold"
              : "Nunito_600SemiBold",
        },
        style,
      ]}
      numberOfLines={isTruncated ? 1 : props.numberOfLines}
      {...props}
    />
  );
}
