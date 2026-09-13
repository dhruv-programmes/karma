import React from "react";
import { View, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Text } from "@/components/ui/text";

const COLOR_MAP = {
  purchases: "#2EA86E",
  transport: "#3B82F6",
  energy: "#F59E0B",
};

export function CategoryDonut({
  purchases = 0,
  transport = 0,
  energy = 0,
}: {
  purchases: number;
  transport: number;
  energy: number;
}) {
  const safePurchases = Math.max(0, purchases);
  const safeTransport = Math.max(0, transport);
  const safeEnergy = Math.max(0, energy);

  const total = safePurchases + safeTransport + safeEnergy;
  const safeTotal = total > 0 ? total : 1;

  const purchasesPct = Math.round((safePurchases / safeTotal) * 100);
  const transportPct = Math.round((safeTransport / safeTotal) * 100);
  const energyPct = Math.max(0, 100 - purchasesPct - transportPct);

  const rows = [
    {
      key: "purchases",
      label: "Purchases",
      value: safePurchases,
      pct: purchasesPct,
      color: COLOR_MAP.purchases,
    },
    {
      key: "transport",
      label: "Transport",
      value: safeTransport,
      pct: transportPct,
      color: COLOR_MAP.transport,
    },
    {
      key: "energy",
      label: "Energy",
      value: safeEnergy,
      pct: energyPct,
      color: COLOR_MAP.energy,
    },
  ];

  const chartData = rows.map((r) => ({
    value: Math.max(0.1, r.value),
    color: r.color,
    text: `${r.pct}%`,
  }));

  return (
    <View style={styles.card}>
      {/* Clean Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Emissions Breakdown</Text>
          <Text style={styles.subtitle}>
            Distribution across lifestyle categories
          </Text>
        </View>
      </View>

      {/* Main Chart + Legend Section */}
      <View style={styles.chartAndLegend}>
        {/* Compact Donut */}
        <View style={styles.donutWrapper}>
          <PieChart
            data={chartData}
            donut
            radius={48}
            innerRadius={30}
            innerCircleColor="#FFFFFF"
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerLabelNum}>~{Math.round(total)}</Text>
                <Text style={styles.centerLabelUnit}>kg CO₂</Text>
              </View>
            )}
          />
        </View>

        {/* Legend Rows */}
        <View style={styles.legendWrapper}>
          {rows.map((r) => (
            <View key={r.key} style={styles.legendItem}>
              <View style={styles.legendTopRow}>
                <View style={styles.legendNameWrap}>
                  <View style={[styles.colorDot, { backgroundColor: r.color }]} />
                  <Text style={styles.legendLabel}>{r.label}</Text>
                  <Text style={styles.pctText}>{r.pct}%</Text>
                </View>
                <Text style={styles.legendKg}>~{Math.round(r.value)} kg</Text>
              </View>

              {/* Quiet mini progress bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: r.color,
                      width: `${Math.min(100, Math.max(3, r.pct))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
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
  chartAndLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  donutWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 96,
    height: 96,
  },
  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabelNum: {
    fontSize: 15,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#0D1811",
    lineHeight: 18,
  },
  centerLabelUnit: {
    fontSize: 8,
    fontFamily: "Nunito_700Bold",
    color: "#94A3B8",
    marginTop: 1,
  },
  legendWrapper: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  legendItem: {
    gap: 4,
  },
  legendTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    color: "#0D1811",
  },
  pctText: {
    fontSize: 11,
    fontFamily: "IBMPlexMono_500Medium",
    color: "#94A3B8",
    marginLeft: 2,
  },
  legendKg: {
    fontSize: 12.5,
    fontFamily: "IBMPlexMono_600SemiBold",
    color: "#475569",
  },
  progressBarTrack: {
    height: 3.5,
    backgroundColor: "#F1F5F3",
    borderRadius: 2,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
