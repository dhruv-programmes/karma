import React from "react";
import {
  ScrollView as RNScrollView,
  type ScrollViewProps as RNScrollViewProps,
} from "react-native";

export type ScrollViewProps = RNScrollViewProps & {
  className?: string;
  contentClassName?: string;
};

export function ScrollView({
  className,
  contentClassName,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  return (
    <RNScrollView
      className={className}
      contentContainerClassName={contentClassName}
      contentContainerStyle={contentContainerStyle}
      {...props}
    />
  );
}
