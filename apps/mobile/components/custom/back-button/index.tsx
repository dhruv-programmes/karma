import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";

interface BackButtonProps {
  label?: string;
  fallbackRoute?: string;
  onPress?: () => void;
  variant?: "pill" | "circle";
}

export function BackButton({
  label = "Back",
  fallbackRoute = "/(tabs)",
  onPress,
  variant = "pill",
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ignore simulator */
    }
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  };

  if (variant === "circle") {
    return (
      <TouchableOpacity
        style={styles.circleBtn}
        onPress={handlePress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={label || "Back"}
      >
        <ChevronLeft size={22} color="#0D1811" strokeWidth={2.4} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.pillBtn}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <ChevronLeft size={18} color="#0D1811" strokeWidth={2.4} />
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.22)",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  btnText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
});
