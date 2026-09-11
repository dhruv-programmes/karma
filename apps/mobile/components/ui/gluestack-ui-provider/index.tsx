import React, { useEffect } from "react";
import { View } from "react-native";
import { Uniwind } from "uniwind";
import "@/global.css";

type Props = {
  children: React.ReactNode;
  mode?: "light" | "dark" | "system";
};

export function GluestackUIProvider({ children, mode = "light" }: Props) {
  useEffect(() => {
    Uniwind.setTheme(mode === "system" ? "system" : mode);
  }, [mode]);

  return <View className="flex-1 bg-background light">{children}</View>;
}
