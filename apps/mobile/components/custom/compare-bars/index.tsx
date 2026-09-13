import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";

export function CompareBars({
  previousKg = 0,
  thisKg = 0,
}: {
  previousKg: number;
  thisKg: number;
}) {
  const prev = Math.round(previousKg);
  const curr = Math.round(thisKg);

  const diff = prev - curr;
  const pct = prev > 0 ? Math.round((Math.abs(diff) / prev) * 100) : 0;

  const maxVal = Math.max(prev, curr, 1);
  const prevHeightPct = Math.max(12, Math.round((prev / maxVal) * 100));
  const currHeightPct = Math.max(12, Math.round((curr / maxVal) * 100));

  const isReduced = diff > 0;
  const isIncreased = diff < 0;

  return (
    <View style={styles.card}>
      {/* Clean Header with quiet inline delta */}
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Month-over-Month</Text>
          <Text style={styles.subtitle}>
            Comparing total monthly emissions
          </Text>
        </View>
      </View>

      {/* Visual Bars Comparison */}
      <View style={styles.chartStage}>
        <View style={styles.barsContainer}>
          {/* Column 1: Last Month */}
          <View style={styles.barColumn}>
            <Text style={styles.barTopValue}>~{prev} kg</Text>
            <View style={styles.trackColumn}>
              <View
                style={[
                  styles.barFillPrev,
                  { height: `${prevHeightPct}%` },
                ]}
              />
            </View>
            <Text style={styles.barBottomLabel}>Last Month</Text>
          </View>

          {/* Column 2: This Month */}
          <View style={styles.barColumn}>
            <Text style={[styles.barTopValue, styles.barTopValueActive]}>
              ~{curr} kg
            </Text>
            <View style={[styles.trackColumn, styles.trackColumnActive]}>
              <View
                style={[
                  styles.barFillCurr,
                  {
                    height: `${currHeightPct}%`,
                    backgroundColor: isReduced ? "#2EA86E" : isIncreased ? "#F59E0B" : "#2EA86E",
                  },
                ]}
              />
            </View>
            <Text style={[styles.barBottomLabel, styles.barBottomLabelActive]}>
              This Month
            </Text>
          </View>
        </View>

        {/* Crisp baseline */}
        <View style={styles.groundBaseline} />
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
    gap: 16,
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
  chartStage: {
    width: "100%",
    alignItems: "center",
    paddingTop: 6,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 40,
  },
  barColumn: {
    alignItems: "center",
    width: 80,
  },
  barTopValue: {
    fontSize: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#94A3B8",
    marginBottom: 8,
  },
  barTopValueActive: {
    color: "#0D1811",
  },
  trackColumn: {
    width: 48,
    height: 110,
    backgroundColor: "#F1F5F3",
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trackColumnActive: {
    backgroundColor: "#F0FDF4",
  },
  barFillPrev: {
    width: "100%",
    backgroundColor: "#94A3B8",
    borderRadius: 8,
  },
  barFillCurr: {
    width: "100%",
    borderRadius: 8,
  },
  barBottomLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    color: "#94A3B8",
    marginTop: 8,
  },
  barBottomLabelActive: {
    color: "#0D1811",
    fontFamily: "Nunito_700Bold",
  },
  groundBaseline: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: -28,
    width: "90%",
  },
});
