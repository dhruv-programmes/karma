import React from "react";
import { View, StyleSheet } from "react-native";
import { Sparkles, Lightbulb, Zap } from "lucide-react-native";
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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Sparkles size={18} color="#D97706" strokeWidth={2.2} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>AI Carbon Intelligence</Text>
            <Text style={styles.subtitle}>
              Personalized reduction opportunity
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <Zap size={11} color="#059669" strokeWidth={2.4} />
          <Text style={styles.badgeText}>High Impact</Text>
        </View>
      </View>

      {/* Main Insight Box */}
      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightBody}>{body}</Text>
      </View>

      {/* Actionable tip callout */}
      <View style={styles.footnoteRow}>
        <Lightbulb size={13} color="#166534" strokeWidth={2.2} />
        <Text style={styles.footnoteText}>
          Applying this insight can shave up to ~14 kg CO₂e off your monthly
          footprint.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.2)",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    marginTop: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.25)",
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  insightBox: {
    backgroundColor: "#F8FAF9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    gap: 4,
  },
  insightTitle: {
    fontSize: 13.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
  },
  insightBody: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    color: "#526658",
    lineHeight: 18,
  },
  footnoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
  },
  footnoteText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    lineHeight: 15,
    flex: 1,
  },
});
