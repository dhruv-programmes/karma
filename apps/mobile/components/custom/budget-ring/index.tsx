import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";

export function BudgetRing({
  usedPct = 0,
  budgetKg = 90,
  thisMonthKg = 0,
  status = "on_track",
}: {
  usedPct: number;
  budgetKg: number;
  thisMonthKg: number;
  status: string;
}) {
  const safeUsedPct = Math.round(usedPct);
  const safeBudget = Math.round(budgetKg);
  const safeThisMonth = Math.round(thisMonthKg);
  const remaining = safeBudget - safeThisMonth;

  const isOver = status === "over" || safeThisMonth > safeBudget;
  const isWatch = !isOver && (status === "watch" || safeUsedPct >= 75);

  const barColor = isOver ? "#EF4444" : isWatch ? "#F59E0B" : "#2EA86E";

  return (
    <View style={styles.card}>
      {/* Clean Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Monthly Carbon Budget</Text>
          <Text style={styles.subtitle}>
            Target: under {safeBudget} kg CO₂e / month
          </Text>
        </View>
      </View>

      {/* Primary Value & Context */}
      <View style={styles.numbersRow}>
        <View style={styles.numbersLeft}>
          <Text style={styles.currentKg}>~{safeThisMonth}</Text>
          <Text style={styles.budgetKg}> / {safeBudget} kg</Text>
        </View>
      </View>

      {/* Minimalist Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: barColor,
                width: `${Math.min(100, Math.max(2, safeUsedPct))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.milestonesRow}>
          <Text style={styles.milestoneLabel}>0%</Text>
          <Text style={styles.milestoneLabel}>50%</Text>
          <Text style={styles.milestoneLabel}>100%</Text>
        </View>
      </View>
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
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    color: "#0D1811",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Nunito_500Medium",
    color: "#64748B",
    marginTop: 2,
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  numbersLeft: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentKg: {
    fontSize: 30,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    letterSpacing: -0.5,
  },
  budgetKg: {
    fontSize: 14,
    fontFamily: "IBMPlexMono_500Medium",
    color: "#94A3B8",
    marginLeft: 4,
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F1F5F3",
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#94A3B8",
  },
});
