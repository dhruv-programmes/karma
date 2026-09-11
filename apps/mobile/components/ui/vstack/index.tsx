import React from "react";
import { View, type ViewProps } from "react-native";

const spaceMap = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
  "2xl": "gap-8",
} as const;

type StackProps = ViewProps & {
  className?: string;
  space?: keyof typeof spaceMap;
  reversed?: boolean;
};

export function VStack({ className, space, reversed, ...props }: StackProps) {
  return (
    <View
      className={[
        "flex-col",
        reversed ? "flex-col-reverse" : "",
        space ? spaceMap[space] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function HStack({ className, space, reversed, ...props }: StackProps) {
  return (
    <View
      className={[
        "flex-row items-center",
        reversed ? "flex-row-reverse" : "",
        space ? spaceMap[space] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
