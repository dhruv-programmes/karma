import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";

export function InsightCard({
  title = "Optimize Your Consumption",
  body = "Small daily changes make a measurable difference in your monthly carbon footprint.",
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>AI INSIGHT</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.03)",
    elevation: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#2EA86E",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  body: {
    fontSize: 12.5,
    fontFamily: "Nunito_500Medium",
    color: "#526658",
    lineHeight: 18,
  },
});
