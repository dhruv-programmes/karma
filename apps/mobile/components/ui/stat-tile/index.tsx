import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "accent" | "info" | "warning";
}) {
  const valueColor =
    tone === "primary"
      ? "#2EA86E"
      : tone === "accent"
        ? "#10B981"
        : tone === "info"
          ? "#3B82F6"
          : tone === "warning"
            ? "#F59E0B"
            : "#0D1811";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
    gap: 4,
  },
  label: {
    fontSize: 11.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#64748B",
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "IBMPlexMono_600SemiBold",
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 10.5,
    fontFamily: "Nunito_500Medium",
    color: "#94A3B8",
  },
});
