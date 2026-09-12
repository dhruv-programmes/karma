import React from "react";
import { View, StyleSheet } from "react-native";
import { Target, CheckCircle2, AlertTriangle, Clock, Sparkles } from "lucide-react-native";
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

  // Determine status styling
  const isOver = status === "over" || safeThisMonth > safeBudget;
  const isWatch = !isOver && (status === "watch" || safeUsedPct >= 75);

  const barColor = isOver ? "#EF4444" : isWatch ? "#F59E0B" : "#2EA86E";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Target size={18} color="#2EA86E" strokeWidth={2.2} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Monthly Carbon Budget</Text>
            <Text style={styles.subtitle}>
              Target: under {safeBudget} kg CO₂e / month
            </Text>
          </View>
        </View>

        {/* Status Pill Badge */}
        {isOver ? (
          <View style={[styles.statusBadge, styles.statusBadgeOver]}>
            <AlertTriangle size={12} color="#DC2626" strokeWidth={2.2} />
            <Text style={[styles.statusBadgeText, styles.statusTextOver]}>
              Over Budget
            </Text>
          </View>
        ) : isWatch ? (
          <View style={[styles.statusBadge, styles.statusBadgeWatch]}>
            <Clock size={12} color="#D97706" strokeWidth={2.2} />
            <Text style={[styles.statusBadgeText, styles.statusTextWatch]}>
              Close to Limit
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusBadgeGood]}>
            <CheckCircle2 size={12} color="#059669" strokeWidth={2.2} />
            <Text style={[styles.statusBadgeText, styles.statusTextGood]}>
              On Track
            </Text>
          </View>
        )}
      </View>

      {/* Big numbers row */}
      <View style={styles.numbersRow}>
        <View style={styles.numbersLeft}>
          <Text style={styles.currentKg}>~{safeThisMonth}</Text>
          <Text style={styles.budgetKg}> / {safeBudget} kg</Text>
        </View>

        <View
          style={[
            styles.remainingPill,
            isOver
              ? styles.remainingPillOver
              : isWatch
                ? styles.remainingPillWatch
                : styles.remainingPillGood,
          ]}
        >
          <Text
            style={[
              styles.remainingPillText,
              isOver
                ? styles.remainingTextOver
                : isWatch
                  ? styles.remainingTextWatch
                  : styles.remainingTextGood,
            ]}
          >
            {remaining > 0
              ? `~${remaining} kg remaining`
              : `+${Math.abs(remaining)} kg over limit`}
          </Text>
        </View>
      </View>

      {/* Progress Bar with markers */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: barColor,
                width: `${Math.min(100, Math.max(3, safeUsedPct))}%`,
              },
            ]}
          />
        </View>

        {/* Milestone labels */}
        <View style={styles.milestonesRow}>
          <Text style={styles.milestoneLabel}>0%</Text>
          <Text style={styles.milestoneLabel}>50%</Text>
          <Text
            style={[
              styles.milestoneLabel,
              {
                color: barColor,
                fontFamily: "IBMPlexMono_600SemiBold",
              },
            ]}
          >
            {safeUsedPct}% used
          </Text>
        </View>
      </View>

      {/* Footnote callout */}
      <View style={styles.footnoteRow}>
        <Sparkles size={13} color="#166534" strokeWidth={2.2} />
        <Text style={styles.footnoteText}>
          Staying under your {safeBudget} kg goal unlocks +200 bonus Karma Coins
          for green marketplace vouchers at month end.
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeGood: {
    backgroundColor: "#ECFDF5",
    borderColor: "rgba(46,168,110,0.25)",
  },
  statusBadgeWatch: {
    backgroundColor: "#FFFBEB",
    borderColor: "rgba(245,158,11,0.3)",
  },
  statusBadgeOver: {
    backgroundColor: "#FEF2F2",
    borderColor: "rgba(239,68,68,0.3)",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: "Nunito_800ExtraBold",
  },
  statusTextGood: {
    color: "#059669",
  },
  statusTextWatch: {
    color: "#D97706",
  },
  statusTextOver: {
    color: "#DC2626",
  },
  numbersRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  numbersLeft: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentKg: {
    fontSize: 26,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
  },
  budgetKg: {
    fontSize: 13,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#7A9082",
    marginLeft: 2,
  },
  remainingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  remainingPillGood: {
    backgroundColor: "#F0FDF4",
    borderColor: "rgba(46,168,110,0.2)",
  },
  remainingPillWatch: {
    backgroundColor: "#FFFBEB",
    borderColor: "rgba(245,158,11,0.25)",
  },
  remainingPillOver: {
    backgroundColor: "#FEF2F2",
    borderColor: "rgba(239,68,68,0.25)",
  },
  remainingPillText: {
    fontSize: 10.5,
    fontFamily: "Nunito_700Bold",
  },
  remainingTextGood: {
    color: "#059669",
  },
  remainingTextWatch: {
    color: "#D97706",
  },
  remainingTextOver: {
    color: "#DC2626",
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#F1F5F3",
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneLabel: {
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
    color: "#7A9082",
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
