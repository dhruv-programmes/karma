import React from "react";
import { Platform, StyleSheet, Text as RNText, type TextProps as RNTextProps } from "react-native";

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
  size,
  bold,
  isTruncated,
  style,
  ...props
}: TextProps) {
  const flatStyle = StyleSheet.flatten(style);
  const hasCustomFontSize = typeof flatStyle?.fontSize === "number";

  // Only apply default "text-base" if no custom fontSize is specified and no explicit size prop
  const resolvedSizeClass = size
    ? sizeMap[size]
    : hasCustomFontSize
      ? ""
      : "text-base";

  // If a custom fontSize is provided but lineHeight is missing or smaller than fontSize,
  // ensure lineHeight provides enough headroom so CoreText (iOS) and Skia (Android) never clip font ascenders.
  const dynamicLineHeight =
    hasCustomFontSize &&
    (!flatStyle?.lineHeight ||
      (flatStyle.lineHeight as number) < (flatStyle.fontSize as number))
      ? { lineHeight: Math.round((flatStyle.fontSize as number) * 1.25) }
      : null;

  return (
    <RNText
      className={[
        "text-foreground",
        resolvedSizeClass,
        isTruncated ? "truncate" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={[
        {
          ...(Platform.OS === "android" ? { includeFontPadding: true } : {}),
          fontFamily: className?.includes("font-mono")
            ? bold
              ? "IBMPlexMono_600SemiBold"
              : "IBMPlexMono_500Medium"
            : bold
              ? "Nunito_700Bold"
              : "Nunito_600SemiBold",
        },
        style,
        dynamicLineHeight,
      ]}
      numberOfLines={isTruncated ? 1 : props.numberOfLines}
      {...props}
    />
  );
}
