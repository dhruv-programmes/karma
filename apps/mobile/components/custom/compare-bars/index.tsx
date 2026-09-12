import React from "react";
import { View, StyleSheet } from "react-native";
import { BarChart3, TrendingDown, TrendingUp, Sparkles } from "lucide-react-native";
import { Text } from "@/components/ui/text";

export function CompareBars({
  previousKg,
  thisKg,
}: {
  previousKg: number;
  thisKg: number;
}) {
  const prev = Math.round(previousKg || 88);
  const curr = Math.round(thisKg || 74);
  const diff = prev - curr;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;

  // Proportional scale with 25% headroom to guarantee top labels never clip
  const maxVal = Math.max(prev, curr, 100) * 1.25;
  const prevHeightPct = Math.min(100, Math.max(10, Math.round((prev / maxVal) * 100)));
  const currHeightPct = Math.min(100, Math.max(10, Math.round((curr / maxVal) * 100)));

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <BarChart3 size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Month-over-Month Reduction</Text>
            <Text style={styles.subtitle}>
              Comparing total embodied emissions
            </Text>
          </View>
        </View>

        {pct > 0 ? (
          <View style={styles.deltaBadge}>
            <TrendingDown size={11} color="#059669" strokeWidth={2.4} />
            <Text style={styles.deltaText}>↓ {pct}% Saved</Text>
          </View>
        ) : null}
      </View>

      {/* Main Grounded Bar Comparison Area */}
      <View style={styles.chartStage}>
        {/* Subtle Horizontal Reference Guidelines */}
        <View style={styles.guideLines}>
          <View style={styles.guideLine} />
          <View style={styles.guideLine} />
          <View style={styles.guideLine} />
        </View>

        {/* The Two Comparison Bar Columns */}
        <View style={styles.barsContainer}>
          {/* Column 1: Last Month */}
          <View style={styles.barColumn}>
            {/* Top Value Label (with full headroom, zero clipping) */}
            <View style={styles.barTopLabelWrap}>
              <Text style={styles.barValueMuted}>
                ~{prev.toLocaleString()} kg
              </Text>
            </View>

            {/* Vertical Track & Filled Bar */}
            <View style={styles.trackColumn}>
              <View
                style={[
                  styles.barFillPrev,
                  { height: `${prevHeightPct}%` },
                ]}
              />
            </View>

            {/* Bottom X-Axis Labels (Ample space, never truncated) */}
            <View style={styles.barBottomLabels}>
              <Text style={styles.barTitle}>Last Month</Text>
              <Text style={styles.barSubMuted}>Baseline</Text>
            </View>
          </View>

          {/* Center Delta Pill Indicator */}
          <View style={styles.centerDeltaContainer}>
            {diff > 0 ? (
              <View style={styles.centerDeltaPill}>
                <TrendingDown size={13} color="#059669" strokeWidth={2.4} />
                <Text style={styles.centerDeltaVal}>-{diff} kg</Text>
                <Text style={styles.centerDeltaSub}>↓ {pct}% saved</Text>
              </View>
            ) : diff < 0 ? (
              <View style={styles.centerDeltaPillOver}>
                <TrendingUp size={13} color="#DC2626" strokeWidth={2.4} />
                <Text style={styles.centerDeltaValOver}>+{Math.abs(diff)} kg</Text>
                <Text style={styles.centerDeltaSubOver}>↑ {Math.abs(pct)}%</Text>
              </View>
            ) : (
              <View style={styles.centerDeltaPillEqual}>
                <Text style={styles.centerDeltaValEqual}>Same</Text>
                <Text style={styles.centerDeltaSubEqual}>0% change</Text>
              </View>
            )}
          </View>

          {/* Column 2: This Month */}
          <View style={styles.barColumn}>
            {/* Top Value Label (with full headroom, zero clipping) */}
            <View style={styles.barTopLabelWrap}>
              <Text style={styles.barValueActive}>
                ~{curr.toLocaleString()} kg
              </Text>
            </View>

            {/* Vertical Track & Filled Bar */}
            <View style={[styles.trackColumn, styles.trackColumnActive]}>
              <View
                style={[
                  styles.barFillCurr,
                  { height: `${currHeightPct}%` },
                ]}
              />
            </View>

            {/* Bottom X-Axis Labels (Ample space, never truncated) */}
            <View style={styles.barBottomLabels}>
              <Text style={[styles.barTitle, styles.barTitleActive]}>
                This Month
              </Text>
              <Text style={styles.barSubActive}>Current</Text>
            </View>
          </View>
        </View>

        {/* Solid Ground Baseline */}
        <View style={styles.groundBaseline} />
      </View>

      {/* Footnote callout */}
      <View style={styles.footnoteRow}>
        <Sparkles size={13} color="#166534" strokeWidth={2.2} />
        <Text style={styles.footnoteText}>
          {diff > 0
            ? `🎉 You reduced emissions by ${diff.toLocaleString()} kg CO₂e compared to last month!`
            : "Complete circular actions to bring your monthly footprint down."}
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
    gap: 14,
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
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.2)",
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
  deltaBadge: {
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
  deltaText: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },

  // Chart Stage
  chartStage: {
    width: "100%",
    position: "relative",
    paddingTop: 8,
    paddingBottom: 4,
  },
  guideLines: {
    position: "absolute",
    top: 36,
    bottom: 46,
    left: 10,
    right: 10,
    justifyContent: "space-between",
  },
  guideLine: {
    height: 1,
    backgroundColor: "rgba(46,168,110,0.08)",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 24,
  },
  barColumn: {
    alignItems: "center",
    width: 84,
  },
  barTopLabelWrap: {
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  barValueMuted: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#64748B",
  },
  barValueActive: {
    fontSize: 11.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  trackColumn: {
    width: 52,
    height: 120,
    backgroundColor: "#F1F5F3",
    borderRadius: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  trackColumnActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "rgba(46,168,110,0.25)",
  },
  barFillPrev: {
    width: "100%",
    backgroundColor: "#94A3B8",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barFillCurr: {
    width: "100%",
    backgroundColor: "#2EA86E",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barBottomLabels: {
    alignItems: "center",
    marginTop: 8,
    gap: 1,
  },
  barTitle: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#183222",
  },
  barTitleActive: {
    color: "#0D1811",
    fontFamily: "Nunito_800ExtraBold",
  },
  barSubMuted: {
    fontSize: 9.5,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
  },
  barSubActive: {
    fontSize: 9.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },

  // Center Delta Pill
  centerDeltaContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 54,
  },
  centerDeltaPill: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(46,168,110,0.3)",
    gap: 1,
  },
  centerDeltaVal: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#059669",
  },
  centerDeltaSub: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#059669",
  },
  centerDeltaPillOver: {
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    gap: 1,
  },
  centerDeltaValOver: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#DC2626",
  },
  centerDeltaSubOver: {
    fontSize: 8.5,
    fontFamily: "Nunito_800ExtraBold",
    color: "#DC2626",
  },
  centerDeltaPillEqual: {
    alignItems: "center",
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
    gap: 1,
  },
  centerDeltaValEqual: {
    fontSize: 10.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#526658",
  },
  centerDeltaSubEqual: {
    fontSize: 8.5,
    fontFamily: "Nunito_700Bold",
    color: "#7A9082",
  },

  // Ground Baseline
  groundBaseline: {
    height: 1.5,
    backgroundColor: "#E2E8F0",
    marginTop: -38,
    width: "100%",
  },

  footnoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5ECE8",
  },
  footnoteText: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    color: "#166534",
    lineHeight: 15,
    flex: 1,
  },
});
