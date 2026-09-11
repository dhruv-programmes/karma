import React from "react";
import { View, type ViewProps } from "react-native";

export type BoxProps = ViewProps & {
  className?: string;
};

export function Box({ className, ...props }: BoxProps) {
  return <View className={className} {...props} />;
}
