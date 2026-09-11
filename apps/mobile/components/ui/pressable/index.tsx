import React from "react";
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from "react-native";

export type PressableProps = RNPressableProps & {
  className?: string;
};

export function Pressable({ className, ...props }: PressableProps) {
  return <RNPressable className={className} {...props} />;
}
